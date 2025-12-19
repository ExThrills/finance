import fs from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const csvEscape = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

async function main() {
  const accountId = process.env.EXPORT_ACCOUNT_ID ?? null;
  const categoryId = process.env.EXPORT_CATEGORY_ID ?? null;
  const startDate = process.env.EXPORT_START_DATE ?? null;
  const endDate = process.env.EXPORT_END_DATE ?? null;
  const output = process.env.EXPORT_OUTPUT ?? "exports/transactions.csv";

  let query = supabase
    .from("transactions")
    .select(
      `
      date,
      description,
      amount,
      notes,
      is_pending,
      account:accounts(name),
      category:categories(name, kind)
    `
    )
    .order("date", { ascending: false });

  if (accountId) {
    query = query.eq("account_id", accountId);
  }
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }
  if (startDate) {
    query = query.gte("date", startDate);
  }
  if (endDate) {
    query = query.lte("date", endDate);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const header = [
    "date",
    "description",
    "amount",
    "account",
    "category",
    "category_kind",
    "notes",
    "pending",
  ];
  const rows = (data ?? []).map((row: any) => [
    row.date,
    row.description,
    row.amount,
    row.account?.name ?? "",
    row.category?.name ?? "",
    row.category?.kind ?? "",
    row.notes ?? "",
    row.is_pending ? "true" : "false",
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  await fs.mkdir("exports", { recursive: true });
  await fs.writeFile(output, csv, "utf8");
  console.log(`Exported ${rows.length} transactions to ${output}`);
}

main().catch((error) => {
  console.error("Export failed", error);
  process.exit(1);
});
