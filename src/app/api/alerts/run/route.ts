import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import type { Database, Json } from "@/types/database";

export const dynamic = "force-dynamic";

type AlertRuleRow = Database["public"]["Tables"]["alert_rules"]["Row"];

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

function startOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function subtractDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - days);
  return copy;
}

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    const { data: rules, error: rulesError } = await supabaseAdmin
      .from("alert_rules")
      .select("*")
      .eq("user_id", userId)
      .eq("enabled", true);

    if (rulesError) {
      throw rulesError;
    }

    if (!rules?.length) {
      return NextResponse.json({ created: 0 });
    }

    const now = new Date();
    const maxLookback = rules.reduce((max, rule) => {
      const base =
        rule.lookback_days ??
        (rule.rule_type === "missed_sync" ? 7 : 30);
      if (rule.rule_type === "low_cash" || rule.rule_type === "high_utilization") {
        return max;
      }
      return Math.max(max, base);
    }, 0);

    const startWindow = subtractDays(now, Math.max(maxLookback * 2, 30));

    const [{ data: accounts, error: accountsError }, { data: transactions, error: txError }] =
      await Promise.all([
        supabaseAdmin.from("accounts").select("*").eq("user_id", userId),
        supabaseAdmin
          .from("transactions")
          .select("id, account_id, category_id, amount, date, category:categories(kind)")
          .eq("user_id", userId)
          .gte("date", toDateString(startWindow))
          .lte("date", toDateString(now)),
      ]);

    if (accountsError) {
      throw accountsError;
    }
    if (txError) {
      throw txError;
    }

    const dayStart = startOfDay(now);
    const { data: recentAlerts, error: recentError } = await supabaseAdmin
      .from("alerts")
      .select("rule_id, payload")
      .eq("user_id", userId)
      .gte("created_at", dayStart.toISOString());

    if (recentError) {
      throw recentError;
    }

    const seenAlerts = new Set(
      (recentAlerts ?? [])
        .map((alert) => {
          const ruleId = alert.rule_id;
          if (!ruleId) {
            return null;
          }
          const payload = (alert.payload as Record<string, unknown>) ?? {};
          const accountId = typeof payload.accountId === "string" ? payload.accountId : "all";
          return `${ruleId}:${accountId}`;
        })
        .filter(Boolean)
    );

    const alertsToCreate: {
      rule_id: string | null;
      message: string;
      payload: Json;
      channel: AlertRuleRow["channel"];
      webhookUrl: string | null;
    }[] = [];

    const expenseTransactions = (transactions ?? []).filter(
      (tx) => tx.category?.kind !== "income"
    );

    const addAlert = (
      rule: AlertRuleRow,
      message: string,
      payload: Record<string, unknown>
    ) => {
      const accountKey =
        typeof payload.accountId === "string" ? payload.accountId : "all";
      const key = `${rule.id}:${accountKey}`;
      if (seenAlerts.has(key)) {
        return;
      }
      seenAlerts.add(key);
      alertsToCreate.push({
        rule_id: rule.id,
        message,
        payload: payload as Json,
        channel: rule.channel,
        webhookUrl: rule.webhook_url,
      });
    };

    for (const rule of rules) {
      if (rule.rule_type === "low_cash") {
        const threshold = rule.threshold_amount ?? 0;
        const scopedAccounts = rule.account_id
          ? accounts?.filter((account) => account.id === rule.account_id)
          : accounts?.filter((account) =>
              ["checking", "savings", "cash"].includes(account.type)
            );
        scopedAccounts?.forEach((account) => {
          if (account.current_balance < threshold) {
            addAlert(
              rule,
              `${account.name} balance is below ${threshold / 100}.`,
              { accountId: account.id, currentBalance: account.current_balance }
            );
          }
        });
      }

      if (rule.rule_type === "high_utilization") {
        const threshold = (rule.threshold_percent ?? 0) / 100;
        const scopedAccounts = rule.account_id
          ? accounts?.filter((account) => account.id === rule.account_id)
          : accounts?.filter((account) => account.type === "credit");
        scopedAccounts?.forEach((account) => {
          if (!account.credit_limit || account.credit_limit <= 0) {
            return;
          }
          const utilization = Math.abs(account.current_balance) / account.credit_limit;
          if (utilization >= threshold) {
            addAlert(
              rule,
              `${account.name} utilization is ${(utilization * 100).toFixed(0)}%.`,
              {
                accountId: account.id,
                utilization: Math.round(utilization * 100),
              }
            );
          }
        });
      }

      if (rule.rule_type === "large_tx") {
        const lookback = rule.lookback_days ?? 30;
        const threshold = rule.threshold_amount ?? 0;
        const start = subtractDays(now, lookback);
        const matches = expenseTransactions.filter((tx) => {
          const date = new Date(tx.date);
          if (date < start || date > now) {
            return false;
          }
          if (rule.account_id && tx.account_id !== rule.account_id) {
            return false;
          }
          if (rule.category_id && tx.category_id !== rule.category_id) {
            return false;
          }
          return tx.amount >= threshold;
        });
        if (matches.length) {
          addAlert(rule, `${matches.length} large transactions detected.`, {
            transactionIds: matches.map((tx) => tx.id),
            threshold,
          });
        }
      }

      if (rule.rule_type === "unusual_spend") {
        const lookback = rule.lookback_days ?? 30;
        const threshold = (rule.threshold_percent ?? 0) / 100;
        const currentStart = subtractDays(now, lookback);
        const previousStart = subtractDays(currentStart, lookback);
        const currentSpend = expenseTransactions.reduce((sum, tx) => {
          const date = new Date(tx.date);
          if (date < currentStart || date > now) {
            return sum;
          }
          if (rule.account_id && tx.account_id !== rule.account_id) {
            return sum;
          }
          if (rule.category_id && tx.category_id !== rule.category_id) {
            return sum;
          }
          return sum + tx.amount;
        }, 0);
        const previousSpend = expenseTransactions.reduce((sum, tx) => {
          const date = new Date(tx.date);
          if (date < previousStart || date >= currentStart) {
            return sum;
          }
          if (rule.account_id && tx.account_id !== rule.account_id) {
            return sum;
          }
          if (rule.category_id && tx.category_id !== rule.category_id) {
            return sum;
          }
          return sum + tx.amount;
        }, 0);
        if (previousSpend > 0 && currentSpend > previousSpend * threshold) {
          addAlert(rule, "Spending is above your usual pace.", {
            currentSpend,
            previousSpend,
          });
        }
      }

      if (rule.rule_type === "missed_sync") {
        const lookback = rule.lookback_days ?? 7;
        const cutoff = subtractDays(now, lookback);
        const scopedAccounts = rule.account_id
          ? accounts?.filter((account) => account.id === rule.account_id)
          : accounts;
        scopedAccounts?.forEach((account) => {
          const lastSync = account.last_sync_at
            ? new Date(account.last_sync_at)
            : null;
          const stale = !lastSync || lastSync < cutoff;
          const errorState = ["error", "disconnected"].includes(account.sync_status);
          if (stale || errorState) {
            addAlert(rule, `${account.name} missed sync.`, {
              accountId: account.id,
              lastSyncAt: account.last_sync_at,
              syncStatus: account.sync_status,
            });
          }
        });
      }
    }

    if (!alertsToCreate.length) {
      return NextResponse.json({ created: 0 });
    }

    await Promise.all(
      alertsToCreate.map(async (alert) => {
        if (alert.channel !== "webhook" || !alert.webhookUrl) {
          return;
        }
        try {
          await fetch(alert.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: alert.message,
              payload: alert.payload,
            }),
          });
        } catch (error) {
          console.warn("Webhook delivery failed", error);
        }
      })
    );

    const { error: insertError } = await supabaseAdmin
      .from("alerts")
      .insert(
        alertsToCreate.map((alert) => ({
          user_id: userId,
          rule_id: alert.rule_id,
          message: alert.message,
          payload: alert.payload as Json,
        }))
      );

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ created: alertsToCreate.length });
  } catch (error) {
    console.error("POST /api/alerts/run failed", error);
    return NextResponse.json(
      { error: "Failed to run alerts." },
      { status: 500 }
    );
  }
}
