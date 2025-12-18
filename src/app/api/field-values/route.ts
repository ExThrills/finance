import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fieldValueSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transactionId");
    const fieldDefinitionId = searchParams.get("fieldDefinitionId");

    const where: Prisma.TransactionFieldValueWhereInput = {
      transaction: { userId },
    };
    if (transactionId) {
      where.transactionId = transactionId;
    }
    if (fieldDefinitionId) {
      where.fieldDefinitionId = fieldDefinitionId;
    }

    const values = await prisma.transactionFieldValue.findMany({
      where,
      include: { fieldDefinition: true },
    });

    return NextResponse.json(values);
  } catch (error) {
    console.error("GET /api/field-values failed", error);
    return NextResponse.json(
      { error: "Failed to load field values." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = fieldValueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id: parsed.data.transactionId, userId },
    });
    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
      );
    }

    const fieldDefinition = await prisma.fieldDefinition.findFirst({
      where: { id: parsed.data.fieldDefinitionId, userId },
    });
    if (!fieldDefinition) {
      return NextResponse.json(
        { error: "Field definition not found." },
        { status: 404 }
      );
    }

    const fieldValue = await prisma.transactionFieldValue.upsert({
      where: {
        transactionId_fieldDefinitionId: {
          transactionId: parsed.data.transactionId,
          fieldDefinitionId: parsed.data.fieldDefinitionId,
        },
      },
      update: {
        valueText: parsed.data.valueText ?? null,
        valueNumber: parsed.data.valueNumber ?? null,
        valueDate: parsed.data.valueDate ?? null,
        valueBool: parsed.data.valueBool ?? null,
      },
      create: {
        transactionId: parsed.data.transactionId,
        fieldDefinitionId: parsed.data.fieldDefinitionId,
        valueText: parsed.data.valueText ?? null,
        valueNumber: parsed.data.valueNumber ?? null,
        valueDate: parsed.data.valueDate ?? null,
        valueBool: parsed.data.valueBool ?? null,
      },
    });

    return NextResponse.json(fieldValue);
  } catch (error) {
    console.error("POST /api/field-values failed", error);
    return NextResponse.json(
      { error: "Failed to save field value." },
      { status: 500 }
    );
  }
}
