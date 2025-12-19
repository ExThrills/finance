import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toRecurringSeries } from "@/lib/mappers";
import { recurringSeriesSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

const toDateString = (date: Date | string) =>
  date instanceof Date
    ? date.toISOString().slice(0, 10)
    : new Date(date).toISOString().slice(0, 10);

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabaseAdmin
      .from("recurring_series")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json((data ?? []).map(toRecurringSeries));
  } catch (error) {
    console.error("GET /api/recurring failed", error);
    return NextResponse.json(
      { error: "Failed to load recurring series." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = recurringSeriesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("recurring_series")
      .insert({
        user_id: userId,
        account_id: parsed.data.accountId,
        category_id: parsed.data.categoryId ?? null,
        description: parsed.data.description,
        amount: parsed.data.amount,
        cadence: parsed.data.cadence,
        next_date: toDateString(parsed.data.nextDate),
        active: parsed.data.active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toRecurringSeries(data));
  } catch (error) {
    console.error("POST /api/recurring failed", error);
    return NextResponse.json(
      { error: "Failed to create recurring series." },
      { status: 500 }
    );
  }
}
