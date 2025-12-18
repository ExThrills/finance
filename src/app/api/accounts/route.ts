import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { accountSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("GET /api/accounts failed", error);
    return NextResponse.json({ error: "Failed to load accounts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = accountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const account = await prisma.account.create({
      data: {
        userId,
        name: parsed.data.name,
        type: parsed.data.type,
      },
    });
    return NextResponse.json(account);
  } catch (error) {
    console.error("POST /api/accounts failed", error);
    return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
  }
}
