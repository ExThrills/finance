import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toAlert } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabaseAdmin
      .from("alerts")
      .select("*, rule:alert_rules(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json((data ?? []).map(toAlert));
  } catch (error) {
    console.error("GET /api/alerts failed", error);
    return NextResponse.json(
      { error: "Failed to load alerts." },
      { status: 500 }
    );
  }
}
