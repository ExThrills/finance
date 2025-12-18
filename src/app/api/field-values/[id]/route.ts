import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fieldValueUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = fieldValueUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.transactionFieldValue.findFirst({
      where: { id: params.id, transaction: { userId } },
      include: { transaction: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Field value not found." },
        { status: 404 }
      );
    }

    const value = await prisma.transactionFieldValue.update({
      where: { id: params.id },
      data: {
        valueText:
          typeof parsed.data.valueText === "undefined"
            ? existing.valueText
            : parsed.data.valueText,
        valueNumber:
          typeof parsed.data.valueNumber === "undefined"
            ? existing.valueNumber
            : parsed.data.valueNumber,
        valueDate:
          typeof parsed.data.valueDate === "undefined"
            ? existing.valueDate
            : parsed.data.valueDate,
        valueBool:
          typeof parsed.data.valueBool === "undefined"
            ? existing.valueBool
            : parsed.data.valueBool,
      },
    });
    return NextResponse.json(value);
  } catch (error) {
    console.error("PATCH /api/field-values/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update field value." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    const existing = await prisma.transactionFieldValue.findFirst({
      where: { id: params.id, transaction: { userId } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Field value not found." },
        { status: 404 }
      );
    }
    await prisma.transactionFieldValue.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/field-values/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete field value." },
      { status: 500 }
    );
  }
}
