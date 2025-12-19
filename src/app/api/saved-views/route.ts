import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toSavedView } from "@/lib/mappers";
import { savedViewSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabaseAdmin
      .from("saved_views")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json((data ?? []).map(toSavedView));
  } catch (error) {
    console.error("GET /api/saved-views failed", error);
    return NextResponse.json(
      { error: "Failed to load saved views." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = savedViewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("saved_views")
      .insert({
        user_id: userId,
        name: parsed.data.name,
        filters: parsed.data.filters,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toSavedView(data));
  } catch (error) {
    console.error("POST /api/saved-views failed", error);
    return NextResponse.json(
      { error: "Failed to create saved view." },
      { status: 500 }
    );
  }
}
