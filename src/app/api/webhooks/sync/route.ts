import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const secret = process.env.WEBHOOK_SECRET;
    if (secret) {
      const provided = request.headers.get("x-webhook-secret");
      if (provided !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const accountId = body?.accountId as string | undefined;
    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required." },
        { status: 400 }
      );
    }

    const status =
      typeof body?.status === "string" ? body.status : "ok";
    const lastSyncAt =
      typeof body?.lastSyncAt === "string"
        ? body.lastSyncAt
        : new Date().toISOString();
    const syncError =
      typeof body?.error === "string" ? body.error : null;

    const { data, error } = await supabaseAdmin
      .from("accounts")
      .update({
        sync_status: status,
        last_sync_at: lastSyncAt,
        sync_error: syncError,
      })
      .eq("id", accountId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, accountId: data.id });
  } catch (error) {
    console.error("POST /api/webhooks/sync failed", error);
    return NextResponse.json(
      { error: "Failed to process webhook." },
      { status: 500 }
    );
  }
}
