import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { syncPlaidItem } from "@/lib/plaid-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const userId = await getCurrentUserId();

    const { data: items, error } = await supabaseAdmin
      .from("plaid_items")
      .select("id, access_token")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    const summaries = [] as Array<{ itemId: string; added: number; modified: number; removed: number }>;

    for (const item of items ?? []) {
      const summary = await syncPlaidItem(userId, item);
      summaries.push({ itemId: item.id, ...summary });
    }

    return NextResponse.json({ summaries });
  } catch (error) {
    console.error("POST /api/plaid/sync failed", error);
    return NextResponse.json(
      { error: "Failed to sync Plaid transactions." },
      { status: 500 }
    );
  }
}
