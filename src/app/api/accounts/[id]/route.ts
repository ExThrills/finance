import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { accountUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = accountUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.account.findFirst({
      where: { id: params.id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const account = await prisma.account.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json(account);
  } catch (error) {
    console.error("PATCH /api/accounts/[id] failed", error);
    return NextResponse.json({ error: "Failed to update account." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    const existing = await prisma.account.findFirst({
      where: { id: params.id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    await prisma.account.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/accounts/[id] failed", error);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
