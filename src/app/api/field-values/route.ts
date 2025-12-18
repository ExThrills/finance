import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toTransactionFieldValue } from "@/lib/mappers";
import { fieldValueSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transactionId");
    const fieldDefinitionId = searchParams.get("fieldDefinitionId");

    let query = supabaseAdmin
      .from("transaction_field_values")
      .select(
        `
        *,
        transaction:transactions!transaction_field_values_transaction_id_fkey(user_id)
      `
      )
      .eq("transaction.user_id", userId);

    if (transactionId) {
      query = query.eq("transaction_id", transactionId);
    }
    if (fieldDefinitionId) {
      query = query.eq("field_definition_id", fieldDefinitionId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return NextResponse.json((data ?? []).map(toTransactionFieldValue));
  } catch (error) {
    console.error("GET /api/field-values failed", error);
    return NextResponse.json(
      { error: "Failed to load field values." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = fieldValueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("id", parsed.data.transactionId)
      .eq("user_id", userId)
      .single();
    if (txError || !transaction) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
      );
    }

    const { data: definition, error: defError } = await supabaseAdmin
      .from("field_definitions")
      .select("id")
      .eq("id", parsed.data.fieldDefinitionId)
      .eq("user_id", userId)
      .single();
    if (defError || !definition) {
      return NextResponse.json(
        { error: "Field definition not found." },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("transaction_field_values")
      .upsert(
        {
          transaction_id: parsed.data.transactionId,
          field_definition_id: parsed.data.fieldDefinitionId,
          value_text: parsed.data.valueText ?? null,
          value_number: parsed.data.valueNumber ?? null,
          value_date: parsed.data.valueDate ?? null,
          value_bool: parsed.data.valueBool ?? null,
        },
        { onConflict: "transaction_id,field_definition_id" }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toTransactionFieldValue(data));
  } catch (error) {
    console.error("POST /api/field-values failed", error);
    return NextResponse.json(
      { error: "Failed to save field value." },
      { status: 500 }
    );
  }
}
