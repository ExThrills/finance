import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toTransactionWithRelations } from "@/lib/mappers";
import { transferSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

const toDateString = (value: Date | string) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : new Date(value).toISOString().slice(0, 10);

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    if (data.sourceAccountId === data.destinationAccountId) {
      return NextResponse.json(
        { error: "Source and destination accounts must differ." },
        { status: 400 }
      );
    }

    // Ensure both accounts belong to the user
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from("accounts")
      .select("id, name")
      .eq("user_id", userId)
      .in("id", [data.sourceAccountId, data.destinationAccountId]);

    if (accountsError || !accounts || accounts.length !== 2) {
      return NextResponse.json(
        { error: "Accounts not found or not authorized." },
        { status: 400 }
      );
    }

    const { data: transfer, error: transferError } = await supabaseAdmin
      .from("transfers")
      .insert({
        user_id: userId,
        source_account_id: data.sourceAccountId,
        destination_account_id: data.destinationAccountId,
        amount: data.amount,
        memo: data.memo ?? null,
        occurred_at: new Date(data.date).toISOString(),
      })
      .select("*")
      .single();

    if (transferError || !transfer) {
      throw transferError ?? new Error("Failed to create transfer");
    }

    const description =
      data.description?.trim() ||
      `Transfer ${accounts.find((a) => a.id === data.sourceAccountId)?.name ?? "Out"} → ${
        accounts.find((a) => a.id === data.destinationAccountId)?.name ?? "In"
      }`;

    const { data: createdTransactions, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert([
        {
          user_id: userId,
          account_id: data.sourceAccountId,
          category_id: null,
          amount: data.amount,
          date: toDateString(data.date),
          description,
          notes: data.memo ?? null,
          is_pending: false,
          transfer_id: transfer.id,
        },
        {
          user_id: userId,
          account_id: data.destinationAccountId,
          category_id: null,
          amount: data.amount,
          date: toDateString(data.date),
          description,
          notes: data.memo ?? null,
          is_pending: false,
          transfer_id: transfer.id,
        },
      ])
      .select(
        `
        *,
        account:accounts!transactions_account_id_fkey(*),
        category:categories!transactions_category_id_fkey(*)
      `
      );

    if (txError || !createdTransactions) {
      throw txError ?? new Error("Failed to create transfer legs");
    }

    return NextResponse.json({
      transfer: {
        id: transfer.id,
      },
      transactions: createdTransactions.map((row) =>
        toTransactionWithRelations(row as any)
      ),
    });
  } catch (error) {
    console.error("POST /api/transfers failed", error);
    return NextResponse.json(
      { error: "Failed to create transfer." },
      { status: 500 }
    );
  }
}
