import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/db";
import { syncPlaidItem } from "@/lib/plaid-sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const itemId = body?.item_id;

    if (!itemId) {
      return NextResponse.json({ ok: true });
    }

    if (body?.webhook_type !== "TRANSACTIONS") {
      return NextResponse.json({ ok: true });
    }

    if (body?.webhook_code !== "SYNC_UPDATES_AVAILABLE") {
      return NextResponse.json({ ok: true });
    }

    const { data: item, error } = await supabaseAdmin
      .from("plaid_items")
      .select("id, user_id, access_token")
      .eq("item_id", itemId)
      .single();

    if (error || !item) {
      return NextResponse.json({ ok: true });
    }

    await syncPlaidItem(item.user_id, { id: item.id, access_token: item.access_token });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/plaid/webhook failed", error);
    return NextResponse.json(
      { error: "Failed to process Plaid webhook." },
      { status: 500 }
    );
  }
}
