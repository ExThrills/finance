import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toAccount } from "@/lib/mappers";
import { accountSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabaseAdmin
      .from("accounts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json((data ?? []).map(toAccount));
  } catch (error) {
    console.error("GET /api/accounts failed", error);
    return NextResponse.json({ error: "Failed to load accounts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = accountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { data, error } = await supabaseAdmin
      .from("accounts")
      .insert({
        user_id: userId,
        name: parsed.data.name,
        type: parsed.data.type,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toAccount(data));
  } catch (error) {
    console.error("POST /api/accounts failed", error);
    return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
  }
}
