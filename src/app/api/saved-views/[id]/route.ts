import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toSavedView } from "@/lib/mappers";
import { savedViewUpdateSchema } from "@/lib/validators";
import type { Database } from "@/types/database";

type SavedViewFilters = Database["public"]["Tables"]["saved_views"]["Row"]["filters"];

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = savedViewUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("saved_views")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError || !existing) {
      return NextResponse.json(
        { error: "Saved view not found." },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("saved_views")
      .update({
        name: parsed.data.name ?? existing.name,
        filters: (parsed.data.filters ?? existing.filters) as SavedViewFilters,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toSavedView(data));
  } catch (error) {
    console.error("PATCH /api/saved-views/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update saved view." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { error: findError } = await supabaseAdmin
      .from("saved_views")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError) {
      return NextResponse.json(
        { error: "Saved view not found." },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin
      .from("saved_views")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/saved-views/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete saved view." },
      { status: 500 }
    );
  }
}
