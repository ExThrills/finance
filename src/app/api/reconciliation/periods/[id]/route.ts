import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toStatementPeriod } from "@/lib/mappers";
import { statementPeriodUpdateSchema } from "@/lib/validators";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = statementPeriodUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("statement_periods")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError || !existing) {
      return NextResponse.json(
        { error: "Statement period not found." },
        { status: 404 }
      );
    }

    const locked = parsed.data.locked ?? existing.locked;
    const { data, error } = await supabaseAdmin
      .from("statement_periods")
      .update({
        locked,
        reconciled_at: locked ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await logAuditEvent({
      userId,
      actorId: userId,
      entityType: "statement_period",
      entityId: id,
      action: locked ? "lock" : "unlock",
      metadata: {
        accountId: existing.account_id,
        startDate: existing.start_date,
        endDate: existing.end_date,
      },
    });

    return NextResponse.json(toStatementPeriod(data));
  } catch (error) {
    console.error("PATCH /api/reconciliation/periods/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update statement period." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { error: findError } = await supabaseAdmin
      .from("statement_periods")
      .select("id, account_id, start_date, end_date")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError) {
      return NextResponse.json(
        { error: "Statement period not found." },
        { status: 404 }
      );
    }
    const { error } = await supabaseAdmin
      .from("statement_periods")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      throw error;
    }

    await logAuditEvent({
      userId,
      actorId: userId,
      entityType: "statement_period",
      entityId: id,
      action: "delete",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/reconciliation/periods/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete statement period." },
      { status: 500 }
    );
  }
}
