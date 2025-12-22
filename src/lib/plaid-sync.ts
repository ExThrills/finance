import type { TransactionsSyncResponse } from "plaid";

import { supabaseAdmin } from "@/lib/db";
import { plaidClient } from "@/lib/plaid";

const toCents = (value: number | null | undefined) =>
  value === null || value === undefined ? null : Math.round(value * 100);

const buildCategoryKey = (name: string, kind: string) =>
  `${name.trim().toLowerCase()}::${kind}`;

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ")
    .trim();

const getCategoryName = (transaction: TransactionsSyncResponse["added"][number]) => {
  if (transaction.personal_finance_category?.primary) {
    return titleCase(transaction.personal_finance_category.primary);
  }
  if (transaction.category?.length) {
    return titleCase(transaction.category[0]);
  }
  return null;
};

const mapKind = (amount: number) => (amount < 0 ? "income" : "expense");

const mapAccountType = (type: string, subtype?: string | null) => {
  if (type === "depository") {
    if (subtype === "savings") {
      return "savings";
    }
    return "checking";
  }
  if (type === "credit") {
    return "credit";
  }
  if (type === "loan") {
    return "loan";
  }
  if (type === "investment") {
    return "investment";
  }
  return "other";
};

export async function syncPlaidItem(userId: string, plaidItem: { id: string; access_token: string }) {
  const { data: accountMappings } = await supabaseAdmin
    .from("plaid_accounts")
    .select("plaid_account_id, account_id")
    .eq("plaid_item_id", plaidItem.id);

  const accountMap = new Map(
    (accountMappings ?? []).map((row) => [row.plaid_account_id, row.account_id])
  );

  const { data: categories } = await supabaseAdmin
    .from("categories")
    .select("id, name, kind")
    .eq("user_id", userId);

  const categoryMap = new Map(
    (categories ?? []).map((category) => [buildCategoryKey(category.name, category.kind), category])
  );

  const ensureCategory = async (name: string, kind: "income" | "expense") => {
    const key = buildCategoryKey(name, kind);
    const existing = categoryMap.get(key);
    if (existing) {
      return existing.id;
    }

    const { data: created, error } = await supabaseAdmin
      .from("categories")
      .upsert(
        {
          user_id: userId,
          name,
          kind,
        },
        { onConflict: "user_id,name,kind" }
      )
      .select()
      .single();

    if (error || !created) {
      throw error ?? new Error("Failed to create category.");
    }

    categoryMap.set(key, created);
    return created.id;
  };

  const { data: syncState } = await supabaseAdmin
    .from("plaid_sync_state")
    .select("cursor")
    .eq("plaid_item_id", plaidItem.id)
    .maybeSingle();

  let cursor = syncState?.cursor ?? null;
  let addedCount = 0;
  let modifiedCount = 0;
  let removedCount = 0;

  const now = new Date().toISOString();

  do {
    const response = await plaidClient.transactionsSync({
      access_token: plaidItem.access_token,
      cursor: cursor ?? undefined,
    });

    const payload = response.data;
    cursor = payload.next_cursor;

    const allTxIds = [
      ...payload.added.map((tx) => tx.transaction_id),
      ...payload.modified.map((tx) => tx.transaction_id),
      ...payload.removed.map((tx) => tx.transaction_id),
    ];

    const { data: existingMaps } = await supabaseAdmin
      .from("plaid_transaction_map")
      .select("plaid_transaction_id, transaction_id")
      .in("plaid_transaction_id", allTxIds.length ? allTxIds : [""]);

    const mapLookup = new Map(
      (existingMaps ?? []).map((row) => [row.plaid_transaction_id, row.transaction_id])
    );

    const upsertTransaction = async (tx: TransactionsSyncResponse["added"][number]) => {
      const accountId = accountMap.get(tx.account_id);
      if (!accountId) {
        return;
      }

      const amount = toCents(tx.amount);
      if (amount === null) {
        return;
      }

      const name = tx.name || tx.merchant_name || "Transaction";
      const kind = mapKind(tx.amount);
      const categoryName = getCategoryName(tx);
      const categoryId = categoryName
        ? await ensureCategory(categoryName, kind)
        : null;

      const existingId = mapLookup.get(tx.transaction_id);

      if (existingId) {
        await supabaseAdmin
          .from("transactions")
          .update({
            account_id: accountId,
            amount,
            date: tx.date,
            description: name,
            category_id: categoryId,
            is_pending: tx.pending,
            updated_at: now,
          })
          .eq("id", existingId);
        return;
      }

      const { data: inserted, error } = await supabaseAdmin
        .from("transactions")
        .insert({
          user_id: userId,
          account_id: accountId,
          amount,
          date: tx.date,
          description: name,
          category_id: categoryId,
          is_pending: tx.pending,
        })
        .select()
        .single();

      if (error || !inserted) {
        throw error ?? new Error("Failed to insert transaction.");
      }

      await supabaseAdmin.from("plaid_transaction_map").insert({
        user_id: userId,
        transaction_id: inserted.id,
        plaid_transaction_id: tx.transaction_id,
        plaid_account_id: tx.account_id,
      });
    };

    for (const tx of payload.added) {
      await upsertTransaction(tx);
      addedCount += 1;
    }

    for (const tx of payload.modified) {
      await upsertTransaction(tx);
      modifiedCount += 1;
    }

    for (const removed of payload.removed) {
      const transactionId = mapLookup.get(removed.transaction_id);
      if (!transactionId) {
        continue;
      }
      await supabaseAdmin.from("transactions").delete().eq("id", transactionId);
      await supabaseAdmin
        .from("plaid_transaction_map")
        .delete()
        .eq("plaid_transaction_id", removed.transaction_id);
      removedCount += 1;
    }

    await supabaseAdmin
      .from("plaid_sync_state")
      .upsert(
        {
          plaid_item_id: plaidItem.id,
          cursor,
          last_synced_at: now,
        },
        { onConflict: "plaid_item_id" }
      );

    if (!payload.has_more) {
      break;
    }
  } while (true);

  const balances = await plaidClient.accountsBalanceGet({
    access_token: plaidItem.access_token,
  });

  for (const account of balances.data.accounts) {
    const accountId = accountMap.get(account.account_id);
    if (!accountId) {
      continue;
    }
    const internalType = mapAccountType(account.type, account.subtype);
    const currentBalance = toCents(account.balances.current) ?? 0;
    const availableBalance = toCents(account.balances.available);
    const creditLimit = toCents(account.balances.limit);
    const availableCredit =
      internalType === "credit" && creditLimit !== null
        ? creditLimit - Math.abs(currentBalance)
        : null;

    await supabaseAdmin
      .from("accounts")
      .update({
        current_balance: currentBalance,
        available_balance: internalType === "credit" ? null : availableBalance ?? null,
        available_credit: availableCredit,
        credit_limit: creditLimit,
        sync_status: "ok",
        last_sync_at: now,
      })
      .eq("id", accountId);
  }

  return { added: addedCount, modified: modifiedCount, removed: removedCount };
}
