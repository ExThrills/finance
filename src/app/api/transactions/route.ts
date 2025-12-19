import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toTransactionWithRelations } from "@/lib/mappers";
import { transactionSchema } from "@/lib/validators";
import { logAuditEvent } from "@/lib/audit";
import { applyRulesToTransaction } from "@/lib/rules";

export const dynamic = "force-dynamic";

const toDateString = (date: Date | string) =>
  date instanceof Date ? date.toISOString().slice(0, 10) : new Date(date).toISOString().slice(0, 10);

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const categoryId = searchParams.get("categoryId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const pending = searchParams.get("pending");

    let query = supabaseAdmin
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
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (accountId) {
      query = query.eq("account_id", accountId);
    }
    if (categoryId) {
      query =
        categoryId === "uncategorized"
          ? query.is("category_id", null)
          : query.eq("category_id", categoryId);
    }
    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }
    if (pending === "true") {
      query = query.eq("is_pending", true);
    }
    if (pending === "false") {
      query = query.eq("is_pending", false);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return NextResponse.json(
      (data ?? []).map((row) => toTransactionWithRelations(row as any))
    );
  } catch (error) {
    console.error("GET /api/transactions failed", error);
    return NextResponse.json(
      { error: "Failed to load transactions." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    if (parsed.data.splits?.length) {
      const sum = parsed.data.splits.reduce((total, split) => total + split.amount, 0);
      if (sum !== parsed.data.amount) {
        return NextResponse.json(
          { error: "Sum of splits must equal total amount." },
          { status: 400 }
        );
      }
    }

    const transactionDate = toDateString(parsed.data.date);
    const { data: lockedPeriod, error: lockError } = await supabaseAdmin
      .from("statement_periods")
      .select("id")
      .eq("user_id", userId)
      .eq("account_id", parsed.data.accountId)
      .eq("locked", true)
      .lte("start_date", transactionDate)
      .gte("end_date", transactionDate)
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
    const { data, error } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: userId,
        account_id: parsed.data.accountId,
        category_id: parsed.data.categoryId ?? null,
        amount: parsed.data.amount,
        date: transactionDate,
        description: parsed.data.description,
        notes: parsed.data.notes ?? null,
        is_pending: parsed.data.isPending ?? false,
        cleared_at: parsed.data.clearedAt ? new Date(parsed.data.clearedAt).toISOString() : null,
        transfer_id: parsed.data.transferId ?? null,
        recurring_group_key: parsed.data.recurringGroupKey ?? null,
        recurring_confidence: parsed.data.recurringConfidence ?? null,
      })
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

    if (parsed.data.splits?.length) {
      const splitPayloads = parsed.data.splits.map((split) => ({
        transaction_id: data.id,
        account_id: split.accountId ?? parsed.data.accountId,
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

    if (parsed.data.tags?.length) {
      const tagPayloads = parsed.data.tags.map((tagId) => ({
        transaction_id: data.id,
        tag_id: tagId,
      }));
      const { error: tagError } = await supabaseAdmin
        .from("transaction_tags")
        .insert(tagPayloads)
        .select();
      if (tagError) {
        throw tagError;
      }
    }

    await applyRulesToTransaction({ userId, transactionId: data.id });

    // re-fetch with splits/tags populated
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
      .eq("id", data.id)
      .single();

    if (hydrateError || !hydrated) {
      throw hydrateError ?? new Error("Failed to hydrate transaction");
    }

    await logAuditEvent({
      userId,
      actorId: userId,
      entityType: "transaction",
      entityId: data.id,
      action: "create",
      metadata: {
        accountId: parsed.data.accountId,
        amount: parsed.data.amount,
        date: transactionDate,
      },
    });

    return NextResponse.json(toTransactionWithRelations(hydrated as any));
  } catch (error) {
    console.error("POST /api/transactions failed", error);
    return NextResponse.json(
      { error: "Failed to create transaction." },
      { status: 500 }
    );
  }
}
