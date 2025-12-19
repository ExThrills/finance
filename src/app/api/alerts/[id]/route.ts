import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toAlert } from "@/lib/mappers";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { data: existing, error: findError } = await supabaseAdmin
      .from("alerts")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError || !existing) {
      return NextResponse.json({ error: "Alert not found." }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from("alerts")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, rule:alert_rules(*)")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toAlert(data as any));
  } catch (error) {
    console.error("PATCH /api/alerts/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to acknowledge alert." },
      { status: 500 }
    );
  }
}
