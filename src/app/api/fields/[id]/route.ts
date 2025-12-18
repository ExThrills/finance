import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toFieldDefinition } from "@/lib/mappers";
import { fieldDefinitionUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = fieldDefinitionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("field_definitions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError || !existing) {
      return NextResponse.json({ error: "Field not found." }, { status: 404 });
    }

    const patch = {
      name: parsed.data.name,
      field_type: parsed.data.fieldType,
      select_options:
        parsed.data.fieldType === "select"
          ? parsed.data.selectOptions ?? existing.select_options ?? []
          : parsed.data.fieldType
          ? null
          : undefined,
    };

    const { data, error } = await supabaseAdmin
      .from("field_definitions")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toFieldDefinition(data));
  } catch (error) {
    console.error("PATCH /api/fields/[id] failed", error);
    return NextResponse.json({ error: "Failed to update field." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { error: findError } = await supabaseAdmin
      .from("field_definitions")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError) {
      return NextResponse.json({ error: "Field not found." }, { status: 404 });
    }
    const { error } = await supabaseAdmin
      .from("field_definitions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/fields/[id] failed", error);
    return NextResponse.json({ error: "Failed to delete field." }, { status: 500 });
  }
}
