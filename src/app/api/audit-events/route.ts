import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toAuditEvent } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    let query = supabaseAdmin
      .from("audit_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }
    if (entityId) {
      query = query.eq("entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return NextResponse.json((data ?? []).map(toAuditEvent));
  } catch (error) {
    console.error("GET /api/audit-events failed", error);
    return NextResponse.json(
      { error: "Failed to load audit events." },
      { status: 500 }
    );
  }
}
