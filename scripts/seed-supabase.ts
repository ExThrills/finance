import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

import { Database } from "../src/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function clearTables() {
  await supabase.from("transaction_field_values").delete().neq("id", "");
  await supabase.from("transactions").delete().neq("id", "");
  await supabase.from("field_definitions").delete().neq("id", "");
  await supabase.from("categories").delete().neq("id", "");
  await supabase.from("accounts").delete().neq("id", "");
  await supabase.from("users").delete().neq("id", "");
}

function daysFrom(date: Date, offset: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next.toISOString().slice(0, 10);
}

async function main() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  await clearTables();

  const passwordHash = await bcrypt.hash("ledgerly-demo", 10);
  const userId = randomUUID();

  const { error: userError } = await supabase.from("users").insert({
    id: userId,
    email: "demo@ledgerly.app",
    password_hash: passwordHash,
  });
  if (userError) throw userError;

  const checkingId = randomUUID();
  const savingsId = randomUUID();
  const amexId = randomUUID();

  await supabase.from("accounts").insert([
    {
      id: checkingId,
      user_id: userId,
      name: "Checking",
      type: "checking",
      institution: "Ally",
      last4: "4321",
      current_balance: 500_000,
      available_balance: 500_000,
      sync_status: "manual",
    },
    {
      id: savingsId,
      user_id: userId,
      name: "Savings",
      type: "savings",
      institution: "Ally",
      last4: "9876",
      current_balance: 750_000,
      available_balance: 750_000,
      sync_status: "manual",
    },
    {
      id: amexId,
      user_id: userId,
      name: "Amex Gold",
      type: "credit",
      institution: "American Express",
      last4: "1002",
      credit_limit: 10_000_00,
      current_balance: 240_000,
      available_credit: 10_000_00 - 240_000,
      apr: 22.99,
      statement_close_day: 20,
      statement_due_day: 15,
      reward_currency: "MR",
      sync_status: "manual",
    },
  ]);

  const rentId = randomUUID();
  const groceriesId = randomUUID();
  const gasId = randomUUID();
  const diningId = randomUUID();
  const salaryId = randomUUID();
  const cashbackId = randomUUID();
  const amexPaymentTransferId = randomUUID();

  await supabase.from("categories").insert([
    { id: rentId, user_id: userId, name: "Rent", kind: "expense" },
    { id: groceriesId, user_id: userId, name: "Groceries", kind: "expense" },
    { id: gasId, user_id: userId, name: "Gas", kind: "expense" },
    { id: diningId, user_id: userId, name: "Dining", kind: "expense" },
    { id: salaryId, user_id: userId, name: "Salary", kind: "income" },
    { id: cashbackId, user_id: userId, name: "Cashback", kind: "income" },
  ]);

  const merchantFieldId = randomUUID();
  await supabase.from("field_definitions").insert({
    id: merchantFieldId,
    user_id: userId,
    name: "Merchant",
    field_type: "text",
  });

  await supabase.from("transactions").insert([
    {
      user_id: userId,
      account_id: checkingId,
      category_id: salaryId,
      amount: 350000,
      date: daysFrom(monthStart, 0),
      description: "Monthly salary",
    },
    {
      user_id: userId,
      account_id: checkingId,
      category_id: rentId,
      amount: 140000,
      date: daysFrom(monthStart, 2),
      description: "Rent payment",
    },
    {
      user_id: userId,
      account_id: checkingId,
      category_id: groceriesId,
      amount: 8650,
      date: daysFrom(monthStart, 5),
      description: "Whole Foods",
    },
    {
      user_id: userId,
      account_id: checkingId,
      category_id: gasId,
      amount: 4200,
      date: daysFrom(monthStart, 8),
      description: "Fuel stop",
    },
    {
      user_id: userId,
      account_id: checkingId,
      category_id: diningId,
      amount: 3200,
      date: daysFrom(monthStart, 11),
      description: "Dinner with friends",
    },
    {
      user_id: userId,
      account_id: amexId,
      category_id: gasId,
      amount: 5200,
      date: daysFrom(monthStart, 9),
      description: "Fuel - Amex",
      is_pending: false,
    },
    {
      user_id: userId,
      account_id: amexId,
      category_id: diningId,
      amount: 6800,
      date: daysFrom(monthStart, 12),
      description: "Date night",
      is_pending: true,
    },
    {
      user_id: userId,
      account_id: amexId,
      category_id: groceriesId,
      amount: 9400,
      date: daysFrom(monthStart, 15),
      description: "Trader Joe's",
      is_pending: false,
    },
    {
      user_id: userId,
      account_id: checkingId,
      category_id: null,
      amount: 60000,
      date: daysFrom(monthStart, 18),
      description: "Payment to Amex Gold",
      is_pending: false,
      transfer_id: amexPaymentTransferId,
    },
    {
      user_id: userId,
      account_id: amexId,
      category_id: null,
      amount: 60000,
      date: daysFrom(monthStart, 18),
      description: "Payment from Checking",
      is_pending: false,
      transfer_id: amexPaymentTransferId,
    },
    {
      user_id: userId,
      account_id: savingsId,
      category_id: null,
      amount: 50000,
      date: daysFrom(monthStart, 12),
      description: "Transfer to savings",
    },
    {
      user_id: userId,
      account_id: checkingId,
      category_id: salaryId,
      amount: 350000,
      date: daysFrom(lastMonthStart, 0),
      description: "Monthly salary",
    },
    {
      user_id: userId,
      account_id: checkingId,
      category_id: rentId,
      amount: 140000,
      date: daysFrom(lastMonthStart, 2),
      description: "Rent payment",
    },
    {
      user_id: userId,
      account_id: checkingId,
      category_id: groceriesId,
      amount: 7400,
      date: daysFrom(lastMonthStart, 6),
      description: "Trader Joe's",
    },
    {
      user_id: userId,
      account_id: checkingId,
      category_id: gasId,
      amount: 3900,
      date: daysFrom(lastMonthStart, 10),
      description: "Gas station",
    },
    {
      user_id: userId,
      account_id: checkingId,
      category_id: diningId,
      amount: 2800,
      date: daysFrom(lastMonthStart, 13),
      description: "Cafe brunch",
    },
    {
      user_id: userId,
      account_id: amexId,
      category_id: diningId,
      amount: 4200,
      date: daysFrom(lastMonthStart, 9),
      description: "Coffee shop",
      is_pending: false,
    },
    {
      user_id: userId,
      account_id: amexId,
      category_id: gasId,
      amount: 4800,
      date: daysFrom(lastMonthStart, 7),
      description: "Shell station",
      is_pending: false,
    },
  ]);

  await supabase.from("transfers").insert({
    id: amexPaymentTransferId,
    user_id: userId,
    source_account_id: checkingId,
    destination_account_id: amexId,
    amount: 60000,
    memo: "Monthly Amex payment",
    occurred_at: daysFrom(monthStart, 18),
  });
}

main()
  .then(() => {
    console.log("Seed complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
