import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toFieldDefinition } from "@/lib/mappers";
import { fieldDefinitionSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabaseAdmin
      .from("field_definitions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json((data ?? []).map(toFieldDefinition));
  } catch (error) {
    console.error("GET /api/fields failed", error);
    return NextResponse.json({ error: "Failed to load fields." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = fieldDefinitionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("field_definitions")
      .insert({
        user_id: userId,
        name: parsed.data.name,
        field_type: parsed.data.fieldType,
        select_options:
          parsed.data.fieldType === "select"
            ? parsed.data.selectOptions ?? []
            : null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toFieldDefinition(data));
  } catch (error) {
    console.error("POST /api/fields failed", error);
    return NextResponse.json({ error: "Failed to create field." }, { status: 500 });
  }
}
