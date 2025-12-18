import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toTransactionWithRelations } from "@/lib/mappers";
import { transactionUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

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
      patch.date = parsed.data.date;
    }
    if (parsed.data.description !== undefined) {
      patch.description = parsed.data.description;
    }
    if (parsed.data.notes !== undefined) {
      patch.notes = parsed.data.notes ?? null;
    }

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .update(patch)
      .eq("id", id)
      .select(
        `
        *,
        account:accounts!transactions_account_id_fkey(*),
        category:categories!transactions_category_id_fkey(*)
      `
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toTransactionWithRelations(data as any));
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
    const { error: findError } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/transactions/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete transaction." },
      { status: 500 }
    );
  }
}
