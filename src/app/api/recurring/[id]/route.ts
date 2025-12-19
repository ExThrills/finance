import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toRecurringSeries } from "@/lib/mappers";
import { recurringSeriesUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const toDateString = (date: Date | string) =>
  date instanceof Date
    ? date.toISOString().slice(0, 10)
    : new Date(date).toISOString().slice(0, 10);

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = recurringSeriesUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("recurring_series")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError || !existing) {
      return NextResponse.json(
        { error: "Recurring series not found." },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("recurring_series")
      .update({
        account_id: parsed.data.accountId ?? existing.account_id,
        category_id:
          parsed.data.categoryId !== undefined
            ? parsed.data.categoryId
            : existing.category_id,
        description: parsed.data.description ?? existing.description,
        amount: parsed.data.amount ?? existing.amount,
        cadence: parsed.data.cadence ?? existing.cadence,
        next_date:
          parsed.data.nextDate !== undefined
            ? toDateString(parsed.data.nextDate)
            : existing.next_date,
        active: parsed.data.active ?? existing.active,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toRecurringSeries(data));
  } catch (error) {
    console.error("PATCH /api/recurring/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update recurring series." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { error: findError } = await supabaseAdmin
      .from("recurring_series")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError) {
      return NextResponse.json(
        { error: "Recurring series not found." },
        { status: 404 }
      );
    }
    const { error } = await supabaseAdmin
      .from("recurring_series")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/recurring/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete recurring series." },
      { status: 500 }
    );
  }
}
