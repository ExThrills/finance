import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toTransactionWithRelations } from "@/lib/mappers";
import { transactionUpdateSchema } from "@/lib/validators";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const computeBalanceDelta = ({
  accountType,
  categoryKind,
  amount,
}: {
  accountType: string;
  categoryKind: string | null;
  amount: number;
}) => {
  const normalizedKind = categoryKind ?? "expense";
  const isCredit = accountType === "credit";
  if (normalizedKind === "income") {
    return isCredit ? -amount : amount;
  }
  return isCredit ? amount : -amount;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = transactionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError || !existing) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
      );
    }

    const nextAccountId =
      parsed.data.accountId !== undefined
        ? parsed.data.accountId
        : existing.account_id;
    const nextDate =
      parsed.data.date !== undefined
        ? parsed.data.date instanceof Date
          ? parsed.data.date.toISOString().slice(0, 10)
          : new Date(parsed.data.date).toISOString().slice(0, 10)
        : existing.date;

    const { data: lockedPeriod, error: lockError } = await supabaseAdmin
      .from("statement_periods")
      .select("id")
      .eq("user_id", userId)
      .eq("account_id", nextAccountId)
      .eq("locked", true)
      .lte("start_date", nextDate)
      .gte("end_date", nextDate)
      .maybeSingle();

    if (lockError) {
      throw lockError;
    }
    if (lockedPeriod) {
      return NextResponse.json(
        { error: "This statement period is locked." },
        { status: 403 }
      );
    }

    const patch: Record<string, unknown> = {};
    if (parsed.data.accountId !== undefined) {
      patch.account_id = parsed.data.accountId;
    }
    if (parsed.data.categoryId !== undefined) {
      patch.category_id = parsed.data.categoryId;
    }
    if (parsed.data.amount !== undefined) {
      patch.amount = parsed.data.amount;
    }
    if (parsed.data.date !== undefined) {
      patch.date =
        parsed.data.date instanceof Date
          ? parsed.data.date.toISOString().slice(0, 10)
          : new Date(parsed.data.date).toISOString().slice(0, 10);
    }
    if (parsed.data.description !== undefined) {
      patch.description = parsed.data.description;
    }
    if (parsed.data.notes !== undefined) {
      patch.notes = parsed.data.notes ?? null;
    }
    if (parsed.data.isPending !== undefined) {
      patch.is_pending = parsed.data.isPending;
    }
    if (parsed.data.clearedAt !== undefined) {
      patch.cleared_at = parsed.data.clearedAt
        ? new Date(parsed.data.clearedAt).toISOString()
        : null;
    }
    if (parsed.data.transferId !== undefined) {
      patch.transfer_id = parsed.data.transferId ?? null;
    }
    if (parsed.data.recurringGroupKey !== undefined) {
      patch.recurring_group_key = parsed.data.recurringGroupKey ?? null;
    }
    if (parsed.data.recurringConfidence !== undefined) {
      patch.recurring_confidence = parsed.data.recurringConfidence ?? null;
    }

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .update(patch)
      .eq("id", id)
      .select(
        `
        *,
        account:accounts!transactions_account_id_fkey(*),
        category:categories!transactions_category_id_fkey(*),
        splits:transaction_splits(
          *,
          account:accounts!transaction_splits_account_id_fkey(*),
          category:categories!transaction_splits_category_id_fkey(*)
        ),
        tags:transaction_tags(tag:tags(*))
      `
      )
      .single();

    if (error) {
      throw error;
    }

    if (parsed.data.splits !== undefined) {
      const targetAmount = parsed.data.amount ?? existing.amount;
      const sum = parsed.data.splits?.reduce((total, split) => total + split.amount, 0) ?? 0;
      if (sum !== targetAmount) {
        return NextResponse.json(
          { error: "Sum of splits must equal total amount." },
          { status: 400 }
        );
      }
      await supabaseAdmin.from("transaction_splits").delete().eq("transaction_id", id);
      if (parsed.data.splits.length) {
        const splitPayloads = parsed.data.splits.map((split) => ({
          transaction_id: id,
          account_id: split.accountId ?? existing.account_id,
          category_id: split.categoryId ?? null,
          amount: split.amount,
          description: split.description ?? null,
          notes: split.notes ?? null,
        }));
        const { error: splitError } = await supabaseAdmin
          .from("transaction_splits")
          .insert(splitPayloads);
        if (splitError) {
          throw splitError;
        }
      }
    }

    if (parsed.data.tags !== undefined) {
      await supabaseAdmin.from("transaction_tags").delete().eq("transaction_id", id);
      if (parsed.data.tags.length) {
        const tagPayloads = parsed.data.tags.map((tagId) => ({
          transaction_id: id,
          tag_id: tagId,
        }));
        const { error: tagError } = await supabaseAdmin
          .from("transaction_tags")
          .insert(tagPayloads);
        if (tagError) {
          throw tagError;
        }
      }
    }

    // re-fetch to hydrate splits/tags after changes
    const { data: hydrated, error: hydrateError } = await supabaseAdmin
      .from("transactions")
      .select(
        `
        *,
        account:accounts!transactions_account_id_fkey(*),
        category:categories!transactions_category_id_fkey(*),
        splits:transaction_splits(
          *,
          account:accounts!transaction_splits_account_id_fkey(*),
          category:categories!transaction_splits_category_id_fkey(*)
        ),
        tags:transaction_tags(tag:tags(*))
      `
      )
      .eq("id", id)
      .single();

    if (hydrateError || !hydrated) {
      throw hydrateError ?? new Error("Failed to hydrate transaction");
    }

    if (Object.keys(patch).length || parsed.data.splits || parsed.data.tags) {
      await logAuditEvent({
        userId,
        actorId: userId,
        entityType: "transaction",
        entityId: id,
        action: "update",
        metadata: {
          patch,
          splitsUpdated: parsed.data.splits !== undefined,
          tagsUpdated: parsed.data.tags !== undefined,
        },
      });
    }

    if (Object.keys(patch).length) {
      const accountIds = Array.from(
        new Set([existing.account_id, nextAccountId].filter(Boolean))
      ) as string[];
      const categoryIds = Array.from(
        new Set(
          [existing.category_id, parsed.data.categoryId ?? existing.category_id].filter(
            (value): value is string => Boolean(value)
          )
        )
      );
      const { data: accounts } = await supabaseAdmin
        .from("accounts")
        .select("id, type, sync_status, current_balance, credit_limit")
        .eq("user_id", userId)
        .in("id", accountIds);
      const { data: categories } =
        categoryIds.length > 0
          ? await supabaseAdmin
              .from("categories")
              .select("id, kind")
              .eq("user_id", userId)
              .in("id", categoryIds)
          : { data: [] };

      const accountMap = new Map(accounts?.map((item) => [item.id, item]) ?? []);
      const categoryMap = new Map(categories?.map((item) => [item.id, item]) ?? []);

      const oldAccount = accountMap.get(existing.account_id);
      const newAccount = accountMap.get(nextAccountId);
      const oldCategoryKind =
        existing.category_id ? categoryMap.get(existing.category_id)?.kind ?? null : null;
      const newCategoryId = parsed.data.categoryId ?? existing.category_id;
      const newCategoryKind = newCategoryId
        ? categoryMap.get(newCategoryId)?.kind ?? null
        : null;
      const oldAmount = existing.amount;
      const newAmount = parsed.data.amount ?? existing.amount;

      if (oldAccount && newAccount && oldAccount.id === newAccount.id) {
        const oldDelta = computeBalanceDelta({
          accountType: oldAccount.type,
          categoryKind: oldCategoryKind,
          amount: oldAmount,
        });
        const newDelta = computeBalanceDelta({
          accountType: newAccount.type,
          categoryKind: newCategoryKind,
          amount: newAmount,
        });
        const diff = newDelta - oldDelta;
        if (diff !== 0 && newAccount.sync_status === "manual") {
          const nextBalance = (newAccount.current_balance ?? 0) + diff;
          const payload: Record<string, number> = {
            current_balance: nextBalance,
          };
          if (newAccount.type === "credit" && newAccount.credit_limit !== null) {
            payload.available_credit =
              newAccount.credit_limit - Math.abs(nextBalance);
          }
          if (newAccount.type !== "credit") {
            payload.available_balance = nextBalance;
          }
          await supabaseAdmin
            .from("accounts")
            .update(payload)
            .eq("id", newAccount.id)
            .eq("user_id", userId);
        }
      } else {
        const oldDelta =
          oldAccount && oldAccount.sync_status === "manual"
            ? computeBalanceDelta({
                accountType: oldAccount.type,
                categoryKind: oldCategoryKind,
                amount: oldAmount,
              })
            : 0;
        if (oldAccount && oldAccount.sync_status === "manual" && oldDelta !== 0) {
          const nextBalance = (oldAccount.current_balance ?? 0) - oldDelta;
          const payload: Record<string, number> = {
            current_balance: nextBalance,
          };
          if (oldAccount.type === "credit" && oldAccount.credit_limit !== null) {
            payload.available_credit =
              oldAccount.credit_limit - Math.abs(nextBalance);
          }
          if (oldAccount.type !== "credit") {
            payload.available_balance = nextBalance;
          }
          await supabaseAdmin
            .from("accounts")
            .update(payload)
            .eq("id", oldAccount.id)
            .eq("user_id", userId);
        }

        const newDelta =
          newAccount && newAccount.sync_status === "manual"
            ? computeBalanceDelta({
                accountType: newAccount.type,
                categoryKind: newCategoryKind,
                amount: newAmount,
              })
            : 0;
        if (newAccount && newAccount.sync_status === "manual" && newDelta !== 0) {
          const nextBalance = (newAccount.current_balance ?? 0) + newDelta;
          const payload: Record<string, number> = {
            current_balance: nextBalance,
          };
          if (newAccount.type === "credit" && newAccount.credit_limit !== null) {
            payload.available_credit =
              newAccount.credit_limit - Math.abs(nextBalance);
          }
          if (newAccount.type !== "credit") {
            payload.available_balance = nextBalance;
          }
          await supabaseAdmin
            .from("accounts")
            .update(payload)
            .eq("id", newAccount.id)
            .eq("user_id", userId);
        }
      }
    }

    return NextResponse.json(toTransactionWithRelations(hydrated as any));
  } catch (error) {
    console.error("PATCH /api/transactions/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update transaction." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { data: existing, error: findError } = await supabaseAdmin
      .from("transactions")
      .select("id, account_id, category_id, amount, date")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
      );
    }

    const { data: lockedPeriod, error: lockError } = await supabaseAdmin
      .from("statement_periods")
      .select("id")
      .eq("user_id", userId)
      .eq("account_id", existing.account_id)
      .eq("locked", true)
      .lte("start_date", existing.date)
      .gte("end_date", existing.date)
      .maybeSingle();

    if (lockError) {
      throw lockError;
    }
    if (lockedPeriod) {
      return NextResponse.json(
        { error: "This statement period is locked." },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      throw error;
    }

    const { data: account } = await supabaseAdmin
      .from("accounts")
      .select("id, type, sync_status, current_balance, credit_limit")
      .eq("user_id", userId)
      .eq("id", existing.account_id)
      .maybeSingle();
    const { data: category } = existing.category_id
      ? await supabaseAdmin
          .from("categories")
          .select("id, kind")
          .eq("user_id", userId)
          .eq("id", existing.category_id)
          .maybeSingle()
      : { data: null };

    if (account && account.sync_status === "manual" && category?.kind) {
      const delta = computeBalanceDelta({
        accountType: account.type,
        categoryKind: category.kind ?? null,
        amount: existing.amount,
      });
      if (delta !== 0) {
        const nextBalance = (account.current_balance ?? 0) - delta;
        const payload: Record<string, number> = {
          current_balance: nextBalance,
        };
        if (account.type === "credit" && account.credit_limit !== null) {
          payload.available_credit =
            account.credit_limit - Math.abs(nextBalance);
        }
        if (account.type !== "credit") {
          payload.available_balance = nextBalance;
        }
        await supabaseAdmin
          .from("accounts")
          .update(payload)
          .eq("id", account.id)
          .eq("user_id", userId);
      }
    }

    await logAuditEvent({
      userId,
      actorId: userId,
      entityType: "transaction",
      entityId: id,
      action: "delete",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/transactions/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete transaction." },
      { status: 500 }
    );
  }
}
