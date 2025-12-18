import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { categorySchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET /api/categories failed", error);
    return NextResponse.json(
      { error: "Failed to load categories." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const category = await prisma.category.create({
      data: {
        userId,
        name: parsed.data.name,
        kind: parsed.data.kind,
      },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error("POST /api/categories failed", error);
    return NextResponse.json(
      { error: "Failed to create category." },
      { status: 500 }
    );
  }
}
