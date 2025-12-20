import { supabaseAdmin } from "@/lib/db";
import type { AutomationRuleRecord } from "@/types/finance";
import type { Database } from "@/types/database";

type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
type RuleRow = Database["public"]["Tables"]["automation_rules"]["Row"] & {
  actions?: Database["public"]["Tables"]["rule_actions"]["Row"][];
};

const toDateString = (date: string) => new Date(date).toISOString().slice(0, 10);
const ruleNotePrefix = "Auto-categorized by rule:";

function matchesRule(rule: RuleRow, tx: TransactionRow) {
  if (!rule.enabled) {
    return false;
  }
  if (rule.only_uncategorized && tx.category_id) {
    return false;
  }
  if (rule.match_account_id && tx.account_id !== rule.match_account_id) {
    return false;
  }
  if (rule.match_category_id && tx.category_id !== rule.match_category_id) {
    return false;
  }
  if (rule.match_description) {
    const haystack = (tx.description ?? "").toLowerCase();
    const needle = rule.match_description.toLowerCase();
    if (!haystack.includes(needle)) {
      return false;
    }
  }
  if (rule.match_amount_min !== null && rule.match_amount_min !== undefined) {
    if (tx.amount < rule.match_amount_min) {
      return false;
    }
  }
  if (rule.match_amount_max !== null && rule.match_amount_max !== undefined) {
    if (tx.amount > rule.match_amount_max) {
      return false;
    }
  }
  return true;
}

function parseSplits(payload: Record<string, unknown>) {
  const raw = payload.splits;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((split) => {
      if (!split || typeof split !== "object") {
        return null;
      }
      const item = split as Record<string, unknown>;
      const amount = typeof item.amount === "number" ? item.amount : null;
      if (amount === null) {
        return null;
      }
      return {
        accountId: typeof item.accountId === "string" ? item.accountId : null,
        categoryId: typeof item.categoryId === "string" ? item.categoryId : null,
        amount,
        description:
          typeof item.description === "string" ? item.description : null,
        notes: typeof item.notes === "string" ? item.notes : null,
      };
    })
    .filter(Boolean) as {
    accountId: string | null;
    categoryId: string | null;
    amount: number;
    description: string | null;
    notes: string | null;
  }[];
}

export async function applyRulesToTransaction(params: {
  userId: string;
  transactionId: string;
  mode?: "all" | "uncategorized";
}) {
  const { userId, transactionId } = params;

  const { data: tx, error: txError } = await supabaseAdmin
    .from("transactions")
    .select(
      `
      *,
      tags:transaction_tags(tag_id)
    `
    )
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();

  if (txError || !tx) {
    throw txError ?? new Error("Transaction not found");
  }

  const { data: lockedPeriod } = await supabaseAdmin
    .from("statement_periods")
    .select("id")
    .eq("user_id", userId)
    .eq("account_id", tx.account_id)
    .eq("locked", true)
    .lte("start_date", toDateString(tx.date))
    .gte("end_date", toDateString(tx.date))
    .maybeSingle();

  if (lockedPeriod) {
    return { applied: false, reason: "locked" };
  }

  const { data: rules, error: rulesError } = await supabaseAdmin
    .from("automation_rules")
    .select("*, actions:rule_actions(*)")
    .eq("user_id", userId)
    .eq("enabled", true)
    .order("priority", { ascending: false });

  if (rulesError) {
    throw rulesError;
  }

  if (!rules?.length) {
    return { applied: false };
  }

  let categoryId = tx.category_id;
  let notes = tx.notes;
  let appliedRuleName: string | null = null;
  const tagIds = new Set(
    (tx.tags ?? []).map((row: { tag_id: string }) => row.tag_id)
  );
  let splits: ReturnType<typeof parseSplits> | null = null;

  for (const rule of rules as RuleRow[]) {
    if (!matchesRule(rule, tx)) {
      continue;
    }
    for (const action of rule.actions ?? []) {
      const payload = (action.action_payload as Record<string, unknown>) ?? {};
      if (action.action_type === "set_category") {
        const next = payload.categoryId;
        if (typeof next === "string") {
          if (next !== categoryId) {
            appliedRuleName = rule.name;
          }
          categoryId = next;
        }
      }
      if (action.action_type === "add_tag") {
        const next = payload.tagId;
        if (typeof next === "string") {
          tagIds.add(next);
        }
      }
      if (action.action_type === "set_note") {
        const next = payload.note;
        if (typeof next === "string") {
          notes = notes ? `${notes} · ${next}` : next;
        }
      }
      if (action.action_type === "set_splits") {
        const parsed = parseSplits(payload);
        if (parsed.length) {
          splits = parsed;
        }
      }
    }
  }

  const patch: Record<string, unknown> = {};
  if (categoryId !== tx.category_id) {
    patch.category_id = categoryId;
  }
  if (!notes && appliedRuleName) {
    notes = `${ruleNotePrefix} ${appliedRuleName}`;
  }
  if (notes !== tx.notes) {
    patch.notes = notes ?? null;
  }

  if (Object.keys(patch).length) {
    const { error: updateError } = await supabaseAdmin
      .from("transactions")
      .update(patch)
      .eq("id", tx.id)
      .eq("user_id", userId);
    if (updateError) {
      throw updateError;
    }
  }

  if (splits) {
    const sum = splits.reduce((total, split) => total + split.amount, 0);
    if (sum === tx.amount) {
      await supabaseAdmin
        .from("transaction_splits")
        .delete()
        .eq("transaction_id", tx.id);
      const payloads = splits.map((split) => ({
        transaction_id: tx.id,
        account_id: split.accountId ?? tx.account_id,
        category_id: split.categoryId ?? null,
        amount: split.amount,
        description: split.description,
        notes: split.notes,
      }));
      const { error: splitError } = await supabaseAdmin
        .from("transaction_splits")
        .insert(payloads);
      if (splitError) {
        throw splitError;
      }
    }
  }

  const nextTags = Array.from(tagIds);
  await supabaseAdmin
    .from("transaction_tags")
    .delete()
    .eq("transaction_id", tx.id);
  if (nextTags.length) {
    const tagPayloads = nextTags.map((tagId) => ({
      transaction_id: tx.id,
      tag_id: tagId,
    }));
    const { error: tagError } = await supabaseAdmin
      .from("transaction_tags")
      .insert(tagPayloads);
    if (tagError) {
      throw tagError;
    }
  }

  return { applied: Object.keys(patch).length > 0 || splits !== null || nextTags.length > 0 };
}

export function serializeRule(rule: AutomationRuleRecord) {
  return {
    ...rule,
    actions: rule.actions ?? [],
  };
}
