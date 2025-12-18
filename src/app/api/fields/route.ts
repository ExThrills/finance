import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fieldDefinitionSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const fields = await prisma.fieldDefinition.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(fields);
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

    const field = await prisma.fieldDefinition.create({
      data: {
        userId,
        name: parsed.data.name,
        fieldType: parsed.data.fieldType,
        selectOptions:
          parsed.data.fieldType === "select"
            ? parsed.data.selectOptions ?? []
            : null,
      },
    });
    return NextResponse.json(field);
  } catch (error) {
    console.error("POST /api/fields failed", error);
    return NextResponse.json({ error: "Failed to create field." }, { status: 500 });
  }
}
