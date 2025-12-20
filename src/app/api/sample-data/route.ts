import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

const daysFrom = (base: Date, offset: number) => {
  const next = new Date(base);
  next.setDate(next.getDate() + offset);
  return toDateString(next);
};

export async function POST() {
  try {
    const userId = await getCurrentUserId();

    const [accounts, categories, transactions, budgets] = await Promise.all([
      supabaseAdmin.from("accounts").select("id").eq("user_id", userId).limit(1),
      supabaseAdmin.from("categories").select("id").eq("user_id", userId).limit(1),
      supabaseAdmin.from("transactions").select("id").eq("user_id", userId).limit(1),
      supabaseAdmin.from("budgets").select("id").eq("user_id", userId).limit(1),
    ]);

    if (
      accounts.data?.length ||
      categories.data?.length ||
      transactions.data?.length ||
      budgets.data?.length
    ) {
      return NextResponse.json(
        { error: "Sample data can only be loaded into an empty workspace." },
        { status: 409 }
      );
    }

    const checkingId = randomUUID();
    const savingsId = randomUUID();
    const creditId = randomUUID();

    await supabaseAdmin.from("accounts").insert([
      {
        id: checkingId,
        user_id: userId,
        name: "Everyday Checking",
        type: "checking",
        institution: "Northwind",
        last4: "4821",
        current_balance: 284_500,
        available_balance: 284_500,
        sync_status: "manual",
      },
      {
        id: savingsId,
        user_id: userId,
        name: "Emergency Savings",
        type: "savings",
        institution: "Northwind",
        last4: "1134",
        current_balance: 1_250_000,
        available_balance: 1_250_000,
        sync_status: "manual",
      },
      {
        id: creditId,
        user_id: userId,
        name: "Cobalt Card",
        type: "credit",
        institution: "City Bank",
        last4: "9012",
        credit_limit: 12_500_00,
        current_balance: 265_400,
        available_credit: 12_500_00 - 265_400,
        apr: 19.99,
        statement_close_day: 18,
        statement_due_day: 12,
        reward_currency: "Points",
        sync_status: "manual",
      },
    ]);

    const rentId = randomUUID();
    const groceriesId = randomUUID();
    const gasId = randomUUID();
    const diningId = randomUUID();
    const salaryId = randomUUID();
    const cashbackId = randomUUID();

    await supabaseAdmin.from("categories").insert([
      { id: rentId, user_id: userId, name: "Rent", kind: "expense" },
      { id: groceriesId, user_id: userId, name: "Groceries", kind: "expense" },
      { id: gasId, user_id: userId, name: "Gas", kind: "expense" },
      { id: diningId, user_id: userId, name: "Dining", kind: "expense" },
      { id: salaryId, user_id: userId, name: "Salary", kind: "income" },
      { id: cashbackId, user_id: userId, name: "Cashback", kind: "income" },
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    await supabaseAdmin.from("transactions").insert([
      {
        id: randomUUID(),
        user_id: userId,
        account_id: checkingId,
        category_id: salaryId,
        amount: 520_000,
        date: daysFrom(monthStart, 1),
        description: "Acme Payroll",
        is_pending: false,
      },
      {
        id: randomUUID(),
        user_id: userId,
        account_id: checkingId,
        category_id: rentId,
        amount: 180_000,
        date: daysFrom(monthStart, 2),
        description: "Rent payment",
        is_pending: false,
      },
      {
        id: randomUUID(),
        user_id: userId,
        account_id: creditId,
        category_id: groceriesId,
        amount: 12_450,
        date: daysFrom(monthStart, 4),
        description: "Market Basket",
        is_pending: false,
      },
      {
        id: randomUUID(),
        user_id: userId,
        account_id: creditId,
        category_id: gasId,
        amount: 5_600,
        date: daysFrom(monthStart, 6),
        description: "Shell",
        is_pending: false,
      },
      {
        id: randomUUID(),
        user_id: userId,
        account_id: creditId,
        category_id: diningId,
        amount: 7_800,
        date: daysFrom(monthStart, 8),
        description: "Deli & Co",
        is_pending: true,
      },
      {
        id: randomUUID(),
        user_id: userId,
        account_id: creditId,
        category_id: cashbackId,
        amount: 2_200,
        date: daysFrom(monthStart, 10),
        description: "Rewards redemption",
        is_pending: false,
      },
    ]);

    await supabaseAdmin.from("budgets").insert([
      {
        id: randomUUID(),
        user_id: userId,
        name: "Groceries",
        scope_type: "category",
        category_id: groceriesId,
        account_id: null,
        period: "monthly",
        target_amount: 55_000,
        starts_on: toDateString(monthStart),
      },
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/sample-data failed", error);
    return NextResponse.json(
      { error: "Failed to load sample data." },
      { status: 500 }
    );
  }
}
