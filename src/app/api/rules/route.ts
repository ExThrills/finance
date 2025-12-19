import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toAutomationRule } from "@/lib/mappers";
import { automationRuleSchema } from "@/lib/validators";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabaseAdmin
      .from("automation_rules")
      .select("*, actions:rule_actions(*)")
      .eq("user_id", userId)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json((data ?? []).map(toAutomationRule));
  } catch (error) {
    console.error("GET /api/rules failed", error);
    return NextResponse.json(
      { error: "Failed to load rules." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = automationRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: rule, error } = await supabaseAdmin
      .from("automation_rules")
      .insert({
        user_id: userId,
        name: parsed.data.name,
        enabled: parsed.data.enabled ?? true,
        priority: parsed.data.priority ?? 0,
        only_uncategorized: parsed.data.onlyUncategorized ?? true,
        match_description: parsed.data.matchDescription ?? null,
        match_amount_min: parsed.data.matchAmountMin ?? null,
        match_amount_max: parsed.data.matchAmountMax ?? null,
        match_account_id: parsed.data.matchAccountId ?? null,
        match_category_id: parsed.data.matchCategoryId ?? null,
      })
      .select()
      .single();

    if (error || !rule) {
      throw error ?? new Error("Failed to create rule.");
    }

    const actionPayloads = parsed.data.actions.map((action) => ({
      rule_id: rule.id,
      action_type: action.actionType,
      action_payload: action.actionPayload as Json,
    }));

    const { error: actionError } = await supabaseAdmin
      .from("rule_actions")
      .insert(actionPayloads);
    if (actionError) {
      throw actionError;
    }

    const { data: hydrated, error: hydrateError } = await supabaseAdmin
      .from("automation_rules")
      .select("*, actions:rule_actions(*)")
      .eq("id", rule.id)
      .single();

    if (hydrateError || !hydrated) {
      throw hydrateError ?? new Error("Failed to hydrate rule.");
    }

    return NextResponse.json(toAutomationRule(hydrated));
  } catch (error) {
    console.error("POST /api/rules failed", error);
    return NextResponse.json(
      { error: "Failed to create rule." },
      { status: 500 }
    );
  }
}
