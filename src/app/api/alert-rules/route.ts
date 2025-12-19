import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { toAlertRule } from "@/lib/mappers";
import { alertRuleSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

function validateRule(data: ReturnType<typeof alertRuleSchema.parse>) {
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

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const { data, error } = await supabaseAdmin
      .from("alert_rules")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json((data ?? []).map(toAlertRule));
  } catch (error) {
    console.error("GET /api/alert-rules failed", error);
    return NextResponse.json(
      { error: "Failed to load alert rules." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const parsed = alertRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const validationError = validateRule(parsed.data);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const lookbackDays =
      parsed.data.lookbackDays ??
      (parsed.data.ruleType === "missed_sync" ? 7 : 30);

    const { data, error } = await supabaseAdmin
      .from("alert_rules")
      .insert({
        user_id: userId,
        name: parsed.data.name,
        rule_type: parsed.data.ruleType,
        severity: parsed.data.severity ?? "medium",
        channel: parsed.data.channel ?? "in_app",
        enabled: parsed.data.enabled ?? true,
        threshold_amount: parsed.data.thresholdAmount ?? null,
        threshold_percent: parsed.data.thresholdPercent ?? null,
        lookback_days:
          parsed.data.ruleType === "low_cash" ||
          parsed.data.ruleType === "high_utilization"
            ? null
            : lookbackDays,
        account_id: parsed.data.accountId ?? null,
        category_id: parsed.data.categoryId ?? null,
        webhook_url: parsed.data.webhookUrl ?? null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toAlertRule(data));
  } catch (error) {
    console.error("POST /api/alert-rules failed", error);
    return NextResponse.json(
      { error: "Failed to create alert rule." },
      { status: 500 }
    );
  }
}
