import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toTransactionWithRelations } from "@/lib/mappers";
import { transactionSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const categoryId = searchParams.get("categoryId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = supabaseAdmin
      .from("transactions")
      .select(
        `
        *,
        account:accounts!transactions_account_id_fkey(*),
        category:categories!transactions_category_id_fkey(*)
      `
      )
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (accountId) {
      query = query.eq("account_id", accountId);
    }
    if (categoryId) {
      query =
        categoryId === "uncategorized"
          ? query.is("category_id", null)
          : query.eq("category_id", categoryId);
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

    return NextResponse.json(
      (data ?? []).map((row) => toTransactionWithRelations(row as any))
    );
  } catch (error) {
    console.error("GET /api/transactions failed", error);
    return NextResponse.json(
      { error: "Failed to load transactions." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { data, error } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: userId,
        account_id: parsed.data.accountId,
        category_id: parsed.data.categoryId ?? null,
        amount: parsed.data.amount,
        date: parsed.data.date,
        description: parsed.data.description,
        notes: parsed.data.notes ?? null,
      })
      .select(
        `
        *,
        account:accounts!transactions_account_id_fkey(*),
        category:categories!transactions_category_id_fkey(*)
      `
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toTransactionWithRelations(data as any));
  } catch (error) {
    console.error("POST /api/transactions failed", error);
    return NextResponse.json(
      { error: "Failed to create transaction." },
      { status: 500 }
    );
  }
}
