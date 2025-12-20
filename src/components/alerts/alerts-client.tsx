"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toolbar } from "@/components/ui/toolbar";
import { fetchJson } from "@/lib/api-client";
import { formatCurrency, formatShortDate } from "@/lib/format";
import type { AccountRecord, AlertRecord, AlertRuleRecord, CategoryRecord } from "@/types/finance";

const ruleTypes = [
  "low_cash",
  "high_utilization",
  "unusual_spend",
  "large_tx",
  "missed_sync",
] as const;

const severityLevels = ["low", "medium", "high"] as const;
const channels = ["in_app", "webhook", "email"] as const;

export function AlertsClient() {
  const [rules, setRules] = useState<AlertRuleRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState<(typeof ruleTypes)[number]>("low_cash");
  const [severity, setSeverity] = useState<(typeof severityLevels)[number]>("medium");
  const [channel, setChannel] = useState<(typeof channels)[number]>("in_app");
  const [thresholdAmount, setThresholdAmount] = useState("");
  const [thresholdPercent, setThresholdPercent] = useState("");
  const [lookbackDays, setLookbackDays] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.kind === "expense"),
    [categories]
  );

  const load = async () => {
    setLoading(true);
    try {
      const [rulesData, alertsData, accountsData, categoriesData] =
        await Promise.all([
          fetchJson<AlertRuleRecord[]>("/api/alert-rules"),
          fetchJson<AlertRecord[]>("/api/alerts"),
          fetchJson<AccountRecord[]>("/api/accounts"),
          fetchJson<CategoryRecord[]>("/api/categories"),
        ]);
      setRules(rulesData);
      setAlerts(alertsData);
      setAccounts(accountsData);
      setCategories(categoriesData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load alerts.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Rule name is required.");
      return;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      ruleType,
      severity,
      channel,
      enabled: true,
      accountId: accountId || null,
      categoryId: categoryId || null,
      webhookUrl: channel === "webhook" ? webhookUrl || null : null,
    };

    if (["low_cash", "large_tx"].includes(ruleType)) {
      const amount = Number.parseFloat(thresholdAmount);
      if (Number.isNaN(amount) || amount <= 0) {
        toast.error("Enter a valid threshold amount.");
        return;
      }
      payload.thresholdAmount = Math.round(amount * 100);
    }

    if (["high_utilization", "unusual_spend"].includes(ruleType)) {
      const percent = Number.parseFloat(thresholdPercent);
      if (Number.isNaN(percent) || percent <= 0) {
        toast.error("Enter a valid threshold percent.");
        return;
      }
      payload.thresholdPercent = percent;
    }

    if (["large_tx", "unusual_spend", "missed_sync"].includes(ruleType)) {
      const days = Number.parseInt(lookbackDays, 10);
      if (Number.isNaN(days) || days <= 0) {
        toast.error("Enter a valid lookback window.");
        return;
      }
      payload.lookbackDays = days;
    }

    try {
      const rule = await fetchJson<AlertRuleRecord>("/api/alert-rules", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setRules((prev) => [rule, ...prev]);
      setName("");
      setThresholdAmount("");
      setThresholdPercent("");
      setLookbackDays("");
      setAccountId("");
      setCategoryId("");
      setWebhookUrl("");
      toast.success("Alert rule created.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create rule.";
      toast.error(message);
    }
  };

  const handleToggle = async (rule: AlertRuleRecord) => {
    try {
      const updated = await fetchJson<AlertRuleRecord>(
        `/api/alert-rules/${rule.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled: !rule.enabled }),
        }
      );
      setRules((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update rule.";
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetchJson(`/api/alert-rules/${id}`, { method: "DELETE" });
      setRules((prev) => prev.filter((rule) => rule.id !== id));
      toast.success("Rule removed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete rule.";
      toast.error(message);
    }
  };

  const runChecks = async () => {
    try {
      await fetchJson("/api/alerts/run", { method: "POST" });
      toast.success("Alert checks completed.");
      await load();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to run alerts.";
      toast.error(message);
    }
  };

  const acknowledge = async (id: string) => {
    try {
      const updated = await fetchJson<AlertRecord>(`/api/alerts/${id}`, {
        method: "PATCH",
      });
      setAlerts((prev) => prev.map((alert) => (alert.id === updated.id ? updated : alert)));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to acknowledge alert.";
      toast.error(message);
    }
  };

  const isSnoozed = (alert: AlertRecord) => {
    const until = alert.payload?.snoozedUntil;
    if (!until || typeof until !== "string") {
      return false;
    }
    return new Date(until).getTime() > Date.now();
  };

  const acknowledgeAll = async () => {
    const pending = alerts.filter(
      (alert) => !alert.acknowledgedAt && !isSnoozed(alert)
    );
    if (!pending.length) {
      return;
    }
    try {
      await Promise.all(
        pending.map((alert) =>
          fetchJson(`/api/alerts/${alert.id}`, { method: "PATCH" })
        )
      );
      await load();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to acknowledge all.";
      toast.error(message);
    }
  };

  const snoozeAlert = async (alertId: string) => {
    try {
      await fetchJson(`/api/alerts/${alertId}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "snooze",
          snoozedUntil: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      toast.success("Alert snoozed for 24 hours.");
      await load();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to snooze alert.";
      toast.error(message);
    }
  };

  const severityClasses = (severity: AlertRuleRecord["severity"]) => {
    if (severity === "high") {
      return "bg-rose-100 text-rose-700";
    }
    if (severity === "medium") {
      return "bg-amber-100 text-amber-700";
    }
    return "bg-emerald-100 text-emerald-700";
  };

  const alertsTimeline = useMemo(() => alerts.slice(0, 10), [alerts]);
  const activeCount = useMemo(
    () =>
      alerts.filter((alert) => !alert.acknowledgedAt && !isSnoozed(alert)).length,
    [alerts]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Set thresholds and run checks for cash, utilization, and anomalies."
        actions={
          <Button variant="outline" onClick={runChecks}>
            Run checks
          </Button>
        }
      />

      <Toolbar className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span>{activeCount} active alerts</span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={acknowledgeAll}>
            Acknowledge all
          </Button>
        </div>
      </Toolbar>

      <Card>
        <CardHeader>
          <CardTitle>Create alert rule</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="rule-name">Rule name</Label>
              <Input
                id="rule-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Low cash buffer, Large Amex spend"
              />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={ruleType} onValueChange={(value) => setRuleType(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rule type" />
                </SelectTrigger>
                <SelectContent>
                  {ruleTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={(value) => setSeverity(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  {severityLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(value) => setChannel(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((chan) => (
                    <SelectItem key={chan} value={chan}>
                      {chan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {["low_cash", "large_tx"].includes(ruleType) && (
              <div className="space-y-1">
                <Label>Threshold amount</Label>
                <Input
                  inputMode="decimal"
                  value={thresholdAmount}
                  onChange={(event) => setThresholdAmount(event.target.value)}
                  placeholder="500.00"
                />
              </div>
            )}
            {["high_utilization", "unusual_spend"].includes(ruleType) && (
              <div className="space-y-1">
                <Label>Threshold percent</Label>
                <Input
                  inputMode="decimal"
                  value={thresholdPercent}
                  onChange={(event) => setThresholdPercent(event.target.value)}
                  placeholder="75"
                />
              </div>
            )}
            {["large_tx", "unusual_spend", "missed_sync"].includes(ruleType) && (
              <div className="space-y-1">
                <Label>Lookback days</Label>
                <Input
                  inputMode="numeric"
                  value={lookbackDays}
                  onChange={(event) => setLookbackDays(event.target.value)}
                  placeholder="30"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label>Account (optional)</Label>
              <Select value={accountId || "all"} onValueChange={(value) => setAccountId(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {["large_tx", "unusual_spend"].includes(ruleType) && (
              <div className="space-y-1">
                <Label>Category (optional)</Label>
                <Select value={categoryId || "all"} onValueChange={(value) => setCategoryId(value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {channel === "webhook" && (
              <div className="space-y-1 lg:col-span-2">
                <Label>Webhook URL</Label>
                <Input
                  value={webhookUrl}
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  placeholder="https://hooks.example.com/ledgerly"
                />
              </div>
            )}
            <div className="flex items-end">
              <Button type="submit">Add rule</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.length === 0 ? (
            <EmptyState
              title="No alert rules yet"
              description="Create a rule to get notified about thresholds."
            />
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {rule.ruleType} · {rule.severity} · {rule.channel}
                  </p>
                </div>
                <Badge className={severityClasses(rule.severity)}>
                  {rule.severity}
                </Badge>
                <div className="flex items-center gap-2 text-sm">
                  {rule.thresholdAmount ? (
                    <span>{formatCurrency(rule.thresholdAmount)}</span>
                  ) : null}
                  {rule.thresholdPercent ? <span>{rule.thresholdPercent}%</span> : null}
                  {rule.lookbackDays ? <span>{rule.lookbackDays}d</span> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => handleToggle(rule)}>
                    {rule.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button variant="ghost" onClick={() => handleDelete(rule.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerts timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <EmptyState
              title="Loading alerts"
              description="Pulling the latest alert activity."
            />
          ) : alertsTimeline.length === 0 ? (
            <EmptyState title="No alerts yet" description="You're all caught up." />
          ) : (
            alertsTimeline.map((alert) => {
              const severity = alert.rule?.severity ?? "medium";
              const snoozed = isSnoozed(alert);
              return (
                <div
                  key={alert.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={severityClasses(severity)}>{severity}</Badge>
                      <p className="font-medium">{alert.message}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(alert.createdAt)} ·{" "}
                      {alert.rule?.ruleType ?? "general"}
                      {snoozed && alert.payload?.snoozedUntil
                        ? ` · Snoozed until ${formatShortDate(
                            alert.payload.snoozedUntil as string
                          )}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.acknowledgedAt ? (
                      <span className="text-xs text-muted-foreground">Acknowledged</span>
                    ) : snoozed ? (
                      <Badge variant="secondary">Snoozed</Badge>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => snoozeAlert(alert.id)}>
                          Snooze
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => acknowledge(alert.id)}>
                          Acknowledge
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
