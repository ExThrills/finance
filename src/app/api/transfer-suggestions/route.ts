import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import type { TransferSuggestion } from "@/types/finance";

export const dynamic = "force-dynamic";

function daysUntil(date: Date) {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const { data: accounts, error } = await supabaseAdmin
      .from("accounts")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    const suggestions: TransferSuggestion[] = [];
    const checking = (accounts ?? []).filter((account) =>
      ["checking", "cash"].includes(account.type)
    );
    const savings = (accounts ?? []).filter(
      (account) => account.type === "savings"
    );
    const credit = (accounts ?? []).filter(
      (account) => account.type === "credit"
    );

    const primaryChecking = checking[0] ?? null;
    const primarySavings = savings[0] ?? null;

    if (primaryChecking) {
      const threshold = 200000;
      const excess = primaryChecking.current_balance - threshold;
      if (primarySavings && excess > 5000) {
        const amount = Math.min(excess, 50000);
        suggestions.push({
          id: `rebalance-${primaryChecking.id}-${primarySavings.id}`,
          sourceAccountId: primaryChecking.id,
          destinationAccountId: primarySavings.id,
          amount,
          reason: "Rebalance excess cash into savings.",
        });
      }
    }

    credit.forEach((card) => {
      if (!card.statement_due_day || !primaryChecking) {
        return;
      }
      const dueDate = new Date();
      dueDate.setDate(card.statement_due_day);
      if (dueDate < new Date()) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
      const days = daysUntil(dueDate);
      if (days > 7) {
        return;
      }
      const balance = Math.abs(card.current_balance);
      if (balance <= 0) {
        return;
      }
      const amount = Math.min(balance, primaryChecking.current_balance);
      if (amount <= 0) {
        return;
      }
      suggestions.push({
        id: `pay-${primaryChecking.id}-${card.id}`,
        sourceAccountId: primaryChecking.id,
        destinationAccountId: card.id,
        amount,
        reason: `Card due in ${days} days.`,
      });
    });

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("GET /api/transfer-suggestions failed", error);
    return NextResponse.json(
      { error: "Failed to load transfer suggestions." },
      { status: 500 }
    );
  }
}
