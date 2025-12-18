import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fieldDefinitionUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
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

    const existing = await prisma.fieldDefinition.findFirst({
      where: { id: params.id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Field not found." }, { status: 404 });
    }

    const field = await prisma.fieldDefinition.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        selectOptions:
          parsed.data.fieldType === "select"
            ? parsed.data.selectOptions ?? existing.selectOptions ?? []
            : parsed.data.fieldType
            ? null
            : undefined,
      },
    });
    return NextResponse.json(field);
  } catch (error) {
    console.error("PATCH /api/fields/[id] failed", error);
    return NextResponse.json({ error: "Failed to update field." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    const existing = await prisma.fieldDefinition.findFirst({
      where: { id: params.id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Field not found." }, { status: 404 });
    }
    await prisma.fieldDefinition.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/fields/[id] failed", error);
    return NextResponse.json({ error: "Failed to delete field." }, { status: 500 });
  }
}
