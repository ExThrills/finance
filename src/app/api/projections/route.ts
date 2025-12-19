import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import type { ProjectionPoint } from "@/types/finance";

export const dynamic = "force-dynamic";

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const horizonDays = 90;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = addDays(start, horizonDays);

    const [
      { data: accounts, error: accountsError },
      { data: series, error: seriesError },
    ] = await Promise.all([
      supabaseAdmin.from("accounts").select("*").eq("user_id", userId),
      supabaseAdmin
        .from("recurring_series")
        .select("*")
        .eq("user_id", userId)
        .eq("active", true),
    ]);

    if (accountsError) {
      throw accountsError;
    }
    if (seriesError) {
      throw seriesError;
    }

    const cashAccounts = (accounts ?? []).filter(
      (account) => account.type !== "credit"
    );
    const creditAccounts = (accounts ?? []).filter(
      (account) => account.type === "credit"
    );

    let balance = cashAccounts.reduce(
      (sum, account) => sum + account.current_balance,
      0
    );

    const simulatedSeries = (series ?? []).map((item) => ({
      ...item,
    }));

    const timeline: ProjectionPoint[] = [];
    for (let day = 0; day <= horizonDays; day += 1) {
      const currentDate = addDays(start, day);
      const currentDateString = toDateString(currentDate);

      simulatedSeries.forEach((item) => {
        const nextDate = new Date(item.next_date);
        if (toDateString(nextDate) !== currentDateString) {
          return;
        }
        const sign = item.amount;
        balance += sign;
        // Move next_date forward for projection only
        if (item.cadence === "weekly") {
          nextDate.setDate(nextDate.getDate() + 7);
        } else {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        item.next_date = toDateString(nextDate);
      });

      creditAccounts.forEach((account) => {
        if (!account.statement_due_day) {
          return;
        }
        if (currentDate.getDate() !== account.statement_due_day) {
          return;
        }
        const payment = Math.abs(account.current_balance);
        if (payment > 0) {
          balance -= payment;
        }
      });

      timeline.push({ date: currentDateString, balance });
    }

    return NextResponse.json(timeline);
  } catch (error) {
    console.error("GET /api/projections failed", error);
    return NextResponse.json(
      { error: "Failed to calculate projections." },
      { status: 500 }
    );
  }
}
