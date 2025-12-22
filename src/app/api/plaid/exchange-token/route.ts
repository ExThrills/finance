import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { plaidClient } from "@/lib/plaid";

export const dynamic = "force-dynamic";

const toCents = (value: number | null | undefined) =>
  value === null || value === undefined ? null : Math.round(value * 100);

const mapAccountType = (type: string, subtype: string | null | undefined) => {
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

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const publicToken = body.public_token;
    const institution = body.institution ?? null;

    if (!publicToken) {
      return NextResponse.json(
        { error: "Missing public_token." },
        { status: 400 }
      );
    }

    const exchange = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    const { data: plaidItem, error: plaidItemError } = await supabaseAdmin
      .from("plaid_items")
      .upsert(
        {
          user_id: userId,
          item_id: itemId,
          access_token: accessToken,
          institution_name: institution?.name ?? null,
          institution_id: institution?.institution_id ?? null,
          status: "active",
        },
        { onConflict: "item_id" }
      )
      .select()
      .single();

    if (plaidItemError || !plaidItem) {
      throw plaidItemError ?? new Error("Failed to store Plaid item.");
    }

    const { data: existingMappings } = await supabaseAdmin
      .from("plaid_accounts")
      .select("plaid_account_id, account_id")
      .eq("plaid_item_id", plaidItem.id);

    const mapping = new Map(
      (existingMappings ?? []).map((row) => [row.plaid_account_id, row.account_id])
    );

    const accountsRes = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const now = new Date().toISOString();
    const createdAccountIds: string[] = [];

    for (const account of accountsRes.data.accounts) {
      const accountName = account.official_name || account.name || "Account";
      const internalType = mapAccountType(account.type, account.subtype);
      const currentBalance = toCents(account.balances.current) ?? 0;
      const availableBalance = toCents(account.balances.available);
      const creditLimit = toCents(account.balances.limit);
      const availableCredit =
        internalType === "credit" && creditLimit !== null
          ? creditLimit - Math.abs(currentBalance)
          : null;

      const existingAccountId = mapping.get(account.account_id) ?? null;

      if (existingAccountId) {
        await supabaseAdmin
          .from("accounts")
          .update({
            name: accountName,
            type: internalType,
            institution: institution?.name ?? null,
            last4: account.mask ?? null,
            credit_limit: creditLimit,
            current_balance: currentBalance,
            available_balance:
              internalType === "credit" ? null : availableBalance ?? null,
            available_credit: availableCredit,
            sync_status: "ok",
            last_sync_at: now,
          })
          .eq("id", existingAccountId);
      } else {
        const { data: createdAccount, error: createError } = await supabaseAdmin
          .from("accounts")
          .insert({
            user_id: userId,
            name: accountName,
            type: internalType,
            institution: institution?.name ?? null,
            last4: account.mask ?? null,
            credit_limit: creditLimit,
            current_balance: currentBalance,
            available_balance:
              internalType === "credit" ? null : availableBalance ?? null,
            available_credit: availableCredit,
            sync_status: "ok",
            last_sync_at: now,
          })
          .select()
          .single();

        if (createError || !createdAccount) {
          throw createError ?? new Error("Failed to create account.");
        }

        createdAccountIds.push(createdAccount.id);
        mapping.set(account.account_id, createdAccount.id);
      }

      const accountId = mapping.get(account.account_id) ?? null;
      await supabaseAdmin.from("plaid_accounts").upsert(
        {
          user_id: userId,
          plaid_item_id: plaidItem.id,
          plaid_account_id: account.account_id,
          account_id: accountId,
          name: accountName,
          type: account.type,
          subtype: account.subtype ?? null,
          mask: account.mask ?? null,
        },
        { onConflict: "plaid_account_id" }
      );
    }

    return NextResponse.json({
      item_id: itemId,
      created_accounts: createdAccountIds.length,
    });
  } catch (error) {
    console.error("POST /api/plaid/exchange-token failed", error);
    return NextResponse.json(
      { error: "Failed to exchange Plaid token." },
      { status: 500 }
    );
  }
}
