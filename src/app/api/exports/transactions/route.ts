import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

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

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const categoryId = searchParams.get("categoryId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") ?? "csv";

    if (format !== "csv") {
      return NextResponse.json(
        { error: "Only csv export is available right now." },
        { status: 501 }
      );
    }

    let query = supabaseAdmin
      .from("transactions")
      .select(
        `
        id,
        date,
        description,
        amount,
        notes,
        is_pending,
        account:accounts(name),
        category:categories(name, kind)
      `
      )
      .eq("user_id", userId)
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

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=transactions.csv",
      },
    });
  } catch (error) {
    console.error("GET /api/exports/transactions failed", error);
    return NextResponse.json(
      { error: "Failed to export transactions." },
      { status: 500 }
    );
  }
}
