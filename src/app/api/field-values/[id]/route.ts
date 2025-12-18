import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toTransactionFieldValue } from "@/lib/mappers";
import { fieldValueUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = fieldValueUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("transaction_field_values")
      .select(
        `
        *,
        transaction:transactions!transaction_field_values_transaction_id_fkey(user_id)
      `
      )
      .eq("id", params.id)
      .eq("transaction.user_id", userId)
      .single();
    if (findError || !existing) {
      return NextResponse.json(
        { error: "Field value not found." },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("transaction_field_values")
      .update({
        value_text:
          typeof parsed.data.valueText === "undefined"
            ? existing.value_text
            : parsed.data.valueText,
        value_number:
          typeof parsed.data.valueNumber === "undefined"
            ? existing.value_number
            : parsed.data.valueNumber,
        value_date:
          typeof parsed.data.valueDate === "undefined"
            ? existing.value_date
            : parsed.data.valueDate,
        value_bool:
          typeof parsed.data.valueBool === "undefined"
            ? existing.value_bool
            : parsed.data.valueBool,
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toTransactionFieldValue(data));
  } catch (error) {
    console.error("PATCH /api/field-values/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update field value." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    const { error: findError } = await supabaseAdmin
      .from("transaction_field_values")
      .select(
        `
        id,
        transaction:transactions!transaction_field_values_transaction_id_fkey(user_id)
      `
      )
      .eq("id", params.id)
      .eq("transaction.user_id", userId)
      .single();
    if (findError) {
      return NextResponse.json(
        { error: "Field value not found." },
        { status: 404 }
      );
    }
    const { error } = await supabaseAdmin
      .from("transaction_field_values")
      .delete()
      .eq("id", params.id);
    if (error) {
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/field-values/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete field value." },
      { status: 500 }
    );
  }
}
