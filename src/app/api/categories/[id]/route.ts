import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { categoryUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = categoryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findFirst({
      where: { id: params.id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error("PATCH /api/categories/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update category." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    const existing = await prisma.category.findFirst({
      where: { id: params.id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }
    await prisma.category.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/categories/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete category." },
      { status: 500 }
    );
  }
}
