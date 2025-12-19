import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toTag } from "@/lib/mappers";
import { tagSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabaseAdmin
      .from("tags")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json((data ?? []).map(toTag));
  } catch (error) {
    console.error("GET /api/tags failed", error);
    return NextResponse.json({ error: "Failed to load tags." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = tagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("tags")
      .insert({ user_id: userId, name: parsed.data.name })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toTag(data));
  } catch (error) {
    console.error("POST /api/tags failed", error);
    return NextResponse.json(
      { error: "Failed to create tag." },
      { status: 500 }
    );
  }
}
