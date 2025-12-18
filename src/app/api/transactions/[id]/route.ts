import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { transactionUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = transactionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.transaction.findFirst({
      where: { id: params.id, userId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
      );
    }

    const transaction = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        categoryId:
          parsed.data.categoryId === undefined
            ? undefined
            : parsed.data.categoryId,
      },
      include: { account: true, category: true },
    });
    return NextResponse.json(transaction);
  } catch (error) {
    console.error("PATCH /api/transactions/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update transaction." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    const existing = await prisma.transaction.findFirst({
      where: { id: params.id, userId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
      );
    }
    await prisma.transaction.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/transactions/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete transaction." },
      { status: 500 }
    );
  }
}
