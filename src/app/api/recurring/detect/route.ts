import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import type { RecurringSuggestion } from "@/types/finance";

export const dynamic = "force-dynamic";

type TransactionRow = {
  account_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  date: string;
};

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 120);

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select("account_id, category_id, description, amount, date")
      .eq("user_id", userId)
      .gte("date", toDateString(start))
      .lte("date", toDateString(now))
      .order("date", { ascending: true });

    if (error) {
      throw error;
    }

    const grouped = new Map<string, TransactionRow[]>();
    (data ?? []).forEach((tx) => {
      const key = `${tx.account_id}|${tx.description}|${tx.amount}`;
      const items = grouped.get(key) ?? [];
      items.push(tx as TransactionRow);
      grouped.set(key, items);
    });

    const suggestions: RecurringSuggestion[] = [];

    grouped.forEach((items) => {
      if (items.length < 3) {
        return;
      }
      const intervals: number[] = [];
      for (let i = 1; i < items.length; i += 1) {
        const prev = new Date(items[i - 1].date).getTime();
        const next = new Date(items[i].date).getTime();
        intervals.push(Math.round((next - prev) / (1000 * 60 * 60 * 24)));
      }
      const avg =
        intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
      let cadence: "weekly" | "monthly" | null = null;
      if (avg >= 6 && avg <= 8) {
        cadence = "weekly";
      }
      if (avg >= 25 && avg <= 35) {
        cadence = "monthly";
      }
      if (!cadence) {
        return;
      }

      const last = items[items.length - 1];
      const nextDate = new Date(last.date);
      nextDate.setDate(nextDate.getDate() + (cadence === "weekly" ? 7 : 30));

      suggestions.push({
        accountId: last.account_id,
        categoryId: last.category_id,
        description: last.description,
        amount: last.amount,
        cadence,
        nextDate: toDateString(nextDate),
        count: items.length,
      });
    });

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("POST /api/recurring/detect failed", error);
    return NextResponse.json(
      { error: "Failed to detect recurring transactions." },
      { status: 500 }
    );
  }
}
