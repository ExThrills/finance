import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { applyRulesToTransaction } from "@/lib/rules";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json().catch(() => ({}));
    const transactionId = body?.transactionId as string | undefined;
    const mode = body?.mode === "all" ? "all" : "uncategorized";

    if (transactionId) {
      const result = await applyRulesToTransaction({ userId, transactionId });
      return NextResponse.json({ applied: result.applied ? 1 : 0 });
    }

    let query = supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(100);

    if (mode === "uncategorized") {
      query = query.is("category_id", null);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    let applied = 0;
    for (const row of data ?? []) {
      const result = await applyRulesToTransaction({
        userId,
        transactionId: row.id,
      });
      if (result.applied) {
        applied += 1;
      }
    }

    return NextResponse.json({ applied });
  } catch (error) {
    console.error("POST /api/rules/apply failed", error);
    return NextResponse.json(
      { error: "Failed to apply rules." },
      { status: 500 }
    );
  }
}
