import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toBudget } from "@/lib/mappers";
import { budgetSchema } from "@/lib/validators";
import type { BudgetWithActuals } from "@/types/finance";

export const dynamic = "force-dynamic";

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

function getMonthRange(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getWeekRange(now: Date) {
  const start = new Date(now);
  const day = start.getDay();
  const diff = (day + 6) % 7;
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const { data: budgets, error } = await supabaseAdmin
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    if (!budgets?.length) {
      return NextResponse.json([]);
    }

    const now = new Date();
    const ranges = budgets.map((budget) =>
      budget.period === "weekly" ? getWeekRange(now) : getMonthRange(now)
    );
    const minStart = ranges.reduce(
      (min, range) => (range.start < min ? range.start : min),
      ranges[0].start
    );
    const maxEnd = ranges.reduce(
      (max, range) => (range.end > max ? range.end : max),
      ranges[0].end
    );

    const { data: transactions, error: txError } = await supabaseAdmin
      .from("transactions")
      .select(
        `
        id,
        account_id,
        category_id,
        amount,
        date,
        category:categories(kind)
      `
      )
      .eq("user_id", userId)
      .gte("date", toDateString(minStart))
      .lte("date", toDateString(maxEnd));

    if (txError) {
      throw txError;
    }

    const mapped = budgets.map((budget, index) => {
      const range = ranges[index];
      const start = range.start;
      const end = range.end;
      const actualAmount = (transactions ?? []).reduce((sum, tx) => {
        const date = new Date(tx.date);
        if (date < start || date > end) {
          return sum;
        }
        const isIncome = tx.category?.kind === "income";
        if (isIncome) {
          return sum;
        }
        if (budget.scope_type === "category") {
          if (budget.category_id && tx.category_id !== budget.category_id) {
            return sum;
          }
        } else if (budget.scope_type === "account") {
          if (budget.account_id && tx.account_id !== budget.account_id) {
            return sum;
          }
        }
        return sum + tx.amount;
      }, 0);

      const target = budget.target_amount;
      const percentUsed = target ? Math.round((actualAmount / target) * 100) : 0;
      const record = toBudget(budget);
      const withActuals: BudgetWithActuals = {
        ...record,
        actualAmount,
        periodStart: toDateString(start),
        periodEnd: toDateString(end),
        percentUsed,
      };
      return withActuals;
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/budgets failed", error);
    return NextResponse.json(
      { error: "Failed to load budgets." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = budgetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.scopeType === "category" && !parsed.data.categoryId) {
      return NextResponse.json(
        { error: "Category is required for category budgets." },
        { status: 400 }
      );
    }
    if (parsed.data.scopeType === "account" && !parsed.data.accountId) {
      return NextResponse.json(
        { error: "Account is required for account budgets." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("budgets")
      .insert({
        user_id: userId,
        name: parsed.data.name,
        scope_type: parsed.data.scopeType,
        category_id: parsed.data.categoryId ?? null,
        account_id: parsed.data.accountId ?? null,
        period: parsed.data.period,
        target_amount: parsed.data.targetAmount,
        starts_on: parsed.data.startsOn
          ? toDateString(new Date(parsed.data.startsOn))
          : null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toBudget(data));
  } catch (error) {
    console.error("POST /api/budgets failed", error);
    return NextResponse.json(
      { error: "Failed to create budget." },
      { status: 500 }
    );
  }
}
