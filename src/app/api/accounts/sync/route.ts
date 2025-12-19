import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toAccount } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json().catch(() => ({}));
    const accountId = body?.accountId as string | undefined;
    const now = new Date().toISOString();

    let query = supabaseAdmin
      .from("accounts")
      .update({
        last_sync_at: now,
        sync_status: "ok",
        sync_error: null,
      })
      .eq("user_id", userId)
      .select();

    if (accountId) {
      query = query.eq("id", accountId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return NextResponse.json((data ?? []).map(toAccount));
  } catch (error) {
    console.error("POST /api/accounts/sync failed", error);
    return NextResponse.json(
      { error: "Failed to sync accounts." },
      { status: 500 }
    );
  }
}
