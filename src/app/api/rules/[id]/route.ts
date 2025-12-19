import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toAutomationRule } from "@/lib/mappers";
import { automationRuleUpdateSchema } from "@/lib/validators";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = automationRuleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("automation_rules")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError || !existing) {
      return NextResponse.json({ error: "Rule not found." }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from("automation_rules")
      .update({
        name: parsed.data.name ?? existing.name,
        enabled: parsed.data.enabled ?? existing.enabled,
        priority: parsed.data.priority ?? existing.priority,
        only_uncategorized:
          parsed.data.onlyUncategorized ?? existing.only_uncategorized,
        match_description:
          parsed.data.matchDescription !== undefined
            ? parsed.data.matchDescription
            : existing.match_description,
        match_amount_min:
          parsed.data.matchAmountMin !== undefined
            ? parsed.data.matchAmountMin
            : existing.match_amount_min,
        match_amount_max:
          parsed.data.matchAmountMax !== undefined
            ? parsed.data.matchAmountMax
            : existing.match_amount_max,
        match_account_id:
          parsed.data.matchAccountId !== undefined
            ? parsed.data.matchAccountId
            : existing.match_account_id,
        match_category_id:
          parsed.data.matchCategoryId !== undefined
            ? parsed.data.matchCategoryId
            : existing.match_category_id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (parsed.data.actions) {
      await supabaseAdmin.from("rule_actions").delete().eq("rule_id", id);
      if (parsed.data.actions.length) {
        const payloads = parsed.data.actions.map((action) => ({
          rule_id: id,
          action_type: action.actionType,
          action_payload: action.actionPayload as Json,
        }));
        const { error: actionError } = await supabaseAdmin
          .from("rule_actions")
          .insert(payloads);
        if (actionError) {
          throw actionError;
        }
      }
    }

    const { data: hydrated, error: hydrateError } = await supabaseAdmin
      .from("automation_rules")
      .select("*, actions:rule_actions(*)")
      .eq("id", id)
      .single();
    if (hydrateError || !hydrated) {
      throw hydrateError ?? new Error("Failed to hydrate rule.");
    }

    return NextResponse.json(toAutomationRule(hydrated));
  } catch (error) {
    console.error("PATCH /api/rules/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update rule." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { error: findError } = await supabaseAdmin
      .from("automation_rules")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError) {
      return NextResponse.json({ error: "Rule not found." }, { status: 404 });
    }
    const { error } = await supabaseAdmin
      .from("automation_rules")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/rules/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete rule." },
      { status: 500 }
    );
  }
}
