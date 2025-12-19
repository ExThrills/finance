import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toStatementPeriod } from "@/lib/mappers";
import { statementPeriodSchema } from "@/lib/validators";
import type { StatementPeriodSummary } from "@/types/finance";

export const dynamic = "force-dynamic";

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    let periodsQuery = supabaseAdmin
      .from("statement_periods")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false });

    if (accountId) {
      periodsQuery = periodsQuery.eq("account_id", accountId);
    }

    const { data: periods, error } = await periodsQuery;
    if (error) {
      throw error;
    }

    if (!periods?.length) {
      return NextResponse.json([]);
    }

    const minStart = periods.reduce((min, period) => {
      const value = new Date(period.start_date);
      return value < min ? value : min;
    }, new Date(periods[0].start_date));

    const maxEnd = periods.reduce((max, period) => {
      const value = new Date(period.end_date);
      return value > max ? value : max;
    }, new Date(periods[0].end_date));

    let txQuery = supabaseAdmin
      .from("transactions")
      .select("id, account_id, is_pending, date")
      .eq("user_id", userId)
      .gte("date", toDateString(minStart))
      .lte("date", toDateString(maxEnd));

    if (accountId) {
      txQuery = txQuery.eq("account_id", accountId);
    }

    const { data: transactions, error: txError } = await txQuery;
    if (txError) {
      throw txError;
    }

    const mapped = periods.map<StatementPeriodSummary>((period) => {
      const start = new Date(period.start_date);
      const end = new Date(period.end_date);
      let pendingCount = 0;
      let clearedCount = 0;
      let totalCount = 0;
      (transactions ?? []).forEach((tx) => {
        if (tx.account_id !== period.account_id) {
          return;
        }
        const date = new Date(tx.date);
        if (date < start || date > end) {
          return;
        }
        totalCount += 1;
        if (tx.is_pending) {
          pendingCount += 1;
        } else {
          clearedCount += 1;
        }
      });
      const base = toStatementPeriod(period);
      return {
        ...base,
        pendingCount,
        clearedCount,
        totalCount,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/reconciliation/periods failed", error);
    return NextResponse.json(
      { error: "Failed to load statement periods." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = statementPeriodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.startDate > parsed.data.endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("statement_periods")
      .insert({
        user_id: userId,
        account_id: parsed.data.accountId,
        start_date: toDateString(parsed.data.startDate),
        end_date: toDateString(parsed.data.endDate),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toStatementPeriod(data));
  } catch (error) {
    console.error("POST /api/reconciliation/periods failed", error);
    return NextResponse.json(
      { error: "Failed to create statement period." },
      { status: 500 }
    );
  }
}
