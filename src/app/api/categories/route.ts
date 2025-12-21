import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toCategory } from "@/lib/mappers";
import { categorySchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .order("kind", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json((data ?? []).map(toCategory));
  } catch (error) {
    console.error("GET /api/categories failed", error);
    return NextResponse.json(
      { error: "Failed to load categories." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { data, error } = await supabaseAdmin
      .from("categories")
      .upsert(
        {
          user_id: userId,
          name: parsed.data.name,
          kind: parsed.data.kind,
        },
        { onConflict: "user_id,name,kind" }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toCategory(data));
  } catch (error) {
    console.error("POST /api/categories failed", error);
    return NextResponse.json(
      { error: "Failed to create category." },
      { status: 500 }
    );
  }
}
