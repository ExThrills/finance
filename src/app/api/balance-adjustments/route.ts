import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toBalanceAdjustment } from "@/lib/mappers";
import { balanceAdjustmentSchema } from "@/lib/validators";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

const toDateString = (date: Date | string) =>
  date instanceof Date
    ? date.toISOString().slice(0, 10)
    : new Date(date).toISOString().slice(0, 10);

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    let query = supabaseAdmin
      .from("balance_adjustments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (accountId) {
      query = query.eq("account_id", accountId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return NextResponse.json((data ?? []).map(toBalanceAdjustment));
  } catch (error) {
    console.error("GET /api/balance-adjustments failed", error);
    return NextResponse.json(
      { error: "Failed to load balance adjustments." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = balanceAdjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from("accounts")
      .select("id, current_balance")
      .eq("id", parsed.data.accountId)
      .eq("user_id", userId)
      .single();
    if (accountError || !account) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 }
      );
    }

    const effectiveDate = parsed.data.effectiveDate
      ? toDateString(parsed.data.effectiveDate)
      : toDateString(new Date());

    const { data, error } = await supabaseAdmin
      .from("balance_adjustments")
      .insert({
        user_id: userId,
        account_id: parsed.data.accountId,
        amount: parsed.data.amount,
        memo: parsed.data.memo ?? null,
        effective_date: effectiveDate,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const { error: updateError } = await supabaseAdmin
      .from("accounts")
      .update({
        current_balance: account.current_balance + parsed.data.amount,
      })
      .eq("id", account.id)
      .eq("user_id", userId);

    if (updateError) {
      throw updateError;
    }

    await logAuditEvent({
      userId,
      actorId: userId,
      entityType: "balance_adjustment",
      entityId: data.id,
      action: "create",
      metadata: {
        accountId: parsed.data.accountId,
        amount: parsed.data.amount,
        memo: parsed.data.memo ?? null,
        effectiveDate,
      },
    });

    return NextResponse.json(toBalanceAdjustment(data));
  } catch (error) {
    console.error("POST /api/balance-adjustments failed", error);
    return NextResponse.json(
      { error: "Failed to create balance adjustment." },
      { status: 500 }
    );
  }
}
