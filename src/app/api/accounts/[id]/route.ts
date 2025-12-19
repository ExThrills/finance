import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toAccount } from "@/lib/mappers";
import { accountUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = accountUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("accounts")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError || !existing) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) {
      patch.name = parsed.data.name;
    }
    if (parsed.data.type !== undefined) {
      patch.type = parsed.data.type;
    }
    if (parsed.data.institution !== undefined) {
      patch.institution = parsed.data.institution ?? null;
    }
    if (parsed.data.last4 !== undefined) {
      patch.last4 = parsed.data.last4 ?? null;
    }
    if (parsed.data.creditLimit !== undefined) {
      patch.credit_limit = parsed.data.creditLimit ?? null;
    }
    if (parsed.data.apr !== undefined) {
      patch.apr = parsed.data.apr ?? null;
    }
    if (parsed.data.statementCloseDay !== undefined) {
      patch.statement_close_day = parsed.data.statementCloseDay ?? null;
    }
    if (parsed.data.statementDueDay !== undefined) {
      patch.statement_due_day = parsed.data.statementDueDay ?? null;
    }
    if (parsed.data.rewardCurrency !== undefined) {
      patch.reward_currency = parsed.data.rewardCurrency ?? null;
    }
    if (parsed.data.syncStatus !== undefined) {
      patch.sync_status = parsed.data.syncStatus ?? "manual";
    }

    const { data, error } = await supabaseAdmin
      .from("accounts")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toAccount(data));
  } catch (error) {
    console.error("PATCH /api/accounts/[id] failed", error);
    return NextResponse.json({ error: "Failed to update account." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { error: findError } = await supabaseAdmin
      .from("accounts")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (findError) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("accounts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/accounts/[id] failed", error);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
