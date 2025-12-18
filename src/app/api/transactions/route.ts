import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { transactionSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const categoryId = searchParams.get("categoryId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Prisma.TransactionWhereInput = { userId };
    if (accountId) {
      where.accountId = accountId;
    }
    if (categoryId) {
      where.categoryId = categoryId === "uncategorized" ? null : categoryId;
    }
    if (startDate || endDate) {
      where.date = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { account: true, category: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(transactions);
  } catch (error) {
    console.error("GET /api/transactions failed", error);
    return NextResponse.json(
      { error: "Failed to load transactions." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        accountId: parsed.data.accountId,
        categoryId: parsed.data.categoryId ?? null,
        amount: parsed.data.amount,
        date: parsed.data.date,
        description: parsed.data.description,
        notes: parsed.data.notes ?? null,
      },
      include: { account: true, category: true },
    });
    return NextResponse.json(transaction);
  } catch (error) {
    console.error("POST /api/transactions failed", error);
    return NextResponse.json(
      { error: "Failed to create transaction." },
      { status: 500 }
    );
  }
}
