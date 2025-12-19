import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toBudget } from "@/lib/mappers";
import { budgetUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const toDateString = (date: Date | string) =>
  date instanceof Date
    ? date.toISOString().slice(0, 10)
    : new Date(date).toISOString().slice(0, 10);

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = budgetUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("budgets")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError || !existing) {
      return NextResponse.json({ error: "Budget not found." }, { status: 404 });
    }

    const scopeType = parsed.data.scopeType ?? existing.scope_type;
    const categoryId =
      parsed.data.categoryId !== undefined
        ? parsed.data.categoryId
        : existing.category_id;
    const accountId =
      parsed.data.accountId !== undefined
        ? parsed.data.accountId
        : existing.account_id;

    if (scopeType === "category" && !categoryId) {
      return NextResponse.json(
        { error: "Category is required for category budgets." },
        { status: 400 }
      );
    }
    if (scopeType === "account" && !accountId) {
      return NextResponse.json(
        { error: "Account is required for account budgets." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("budgets")
      .update({
        name: parsed.data.name ?? existing.name,
        scope_type: scopeType,
        category_id: categoryId ?? null,
        account_id: accountId ?? null,
        period: parsed.data.period ?? existing.period,
        target_amount: parsed.data.targetAmount ?? existing.target_amount,
        starts_on:
          parsed.data.startsOn === undefined
            ? existing.starts_on
            : parsed.data.startsOn
            ? toDateString(parsed.data.startsOn)
            : null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toBudget(data));
  } catch (error) {
    console.error("PATCH /api/budgets/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update budget." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { error: findError } = await supabaseAdmin
      .from("budgets")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError) {
      return NextResponse.json({ error: "Budget not found." }, { status: 404 });
    }
    const { error } = await supabaseAdmin
      .from("budgets")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/budgets/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete budget." },
      { status: 500 }
    );
  }
}
