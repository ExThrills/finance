import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toAlertRule } from "@/lib/mappers";
import { alertRuleUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function validateRule(data: {
  ruleType: string;
  channel: string;
  thresholdAmount: number | null;
  thresholdPercent: number | null;
  lookbackDays: number | null;
  webhookUrl: string | null;
}) {
  if (data.channel === "webhook" && !data.webhookUrl) {
    return "Webhook URL is required for webhook alerts.";
  }
  if (data.ruleType === "low_cash" && !data.thresholdAmount) {
    return "Threshold amount is required for low cash alerts.";
  }
  if (data.ruleType === "high_utilization" && !data.thresholdPercent) {
    return "Threshold percent is required for utilization alerts.";
  }
  if (data.ruleType === "large_tx" && !data.thresholdAmount) {
    return "Threshold amount is required for large transaction alerts.";
  }
  if (data.ruleType === "unusual_spend" && !data.thresholdPercent) {
    return "Threshold percent is required for unusual spend alerts.";
  }
  if (data.ruleType === "missed_sync" && !data.lookbackDays) {
    return "Lookback days is required for missed sync alerts.";
  }
  return null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = alertRuleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("alert_rules")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError || !existing) {
      return NextResponse.json(
        { error: "Alert rule not found." },
        { status: 404 }
      );
    }

    const ruleType = parsed.data.ruleType ?? existing.rule_type;
    const channel = parsed.data.channel ?? existing.channel;
    const thresholdAmount =
      parsed.data.thresholdAmount !== undefined
        ? parsed.data.thresholdAmount
        : existing.threshold_amount;
    const thresholdPercent =
      parsed.data.thresholdPercent !== undefined
        ? parsed.data.thresholdPercent
        : existing.threshold_percent;
    const lookbackDays =
      parsed.data.lookbackDays !== undefined
        ? parsed.data.lookbackDays
        : existing.lookback_days;
    const webhookUrl =
      parsed.data.webhookUrl !== undefined
        ? parsed.data.webhookUrl
        : existing.webhook_url;

    const validationError = validateRule({
      ruleType,
      channel,
      thresholdAmount,
      thresholdPercent,
      lookbackDays,
      webhookUrl,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("alert_rules")
      .update({
        name: parsed.data.name ?? existing.name,
        rule_type: ruleType,
        severity: parsed.data.severity ?? existing.severity,
        channel,
        enabled: parsed.data.enabled ?? existing.enabled,
        threshold_amount: thresholdAmount,
        threshold_percent: thresholdPercent,
        lookback_days: lookbackDays,
        account_id:
          parsed.data.accountId !== undefined
            ? parsed.data.accountId
            : existing.account_id,
        category_id:
          parsed.data.categoryId !== undefined
            ? parsed.data.categoryId
            : existing.category_id,
        webhook_url: webhookUrl,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toAlertRule(data));
  } catch (error) {
    console.error("PATCH /api/alert-rules/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update alert rule." },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { error: findError } = await supabaseAdmin
      .from("alert_rules")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (findError) {
      return NextResponse.json(
        { error: "Alert rule not found." },
        { status: 404 }
      );
    }
    const { error } = await supabaseAdmin
      .from("alert_rules")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/alert-rules/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete alert rule." },
      { status: 500 }
    );
  }
}
