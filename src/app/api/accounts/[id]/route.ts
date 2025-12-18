import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toAccount } from "@/lib/mappers";
import { accountUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = accountUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("accounts")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError || !existing) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from("accounts")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toAccount(data));
  } catch (error) {
    console.error("PATCH /api/accounts/[id] failed", error);
    return NextResponse.json({ error: "Failed to update account." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { error: findError } = await supabaseAdmin
      .from("accounts")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (findError) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("accounts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/accounts/[id] failed", error);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
