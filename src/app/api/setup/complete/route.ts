import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const startedAt = Number.parseInt(String(body.startedAt ?? ""), 10);
    const completedAt = Number.parseInt(String(body.completedAt ?? ""), 10);
    const durationSeconds =
      Number.isNaN(startedAt) || Number.isNaN(completedAt)
        ? null
        : Math.max(0, Math.round((completedAt - startedAt) / 1000));

    await logAuditEvent({
      userId,
      actorId: userId,
      entityType: "setup",
      entityId: null,
      action: "completed",
      metadata: {
        durationSeconds,
        accountsCount: body.accountsCount ?? 0,
        debtsCount: body.debtsCount ?? 0,
        categoriesCount: body.categoriesCount ?? 0,
        recurringCount: body.recurringCount ?? 0,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/setup/complete failed", error);
    return NextResponse.json(
      { error: "Failed to record setup completion." },
      { status: 500 }
    );
  }
}
