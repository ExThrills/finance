"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import type {
  AccountRecord,
  AuditEventRecord,
  BalanceAdjustmentRecord,
  StatementPeriodSummary,
} from "@/types/finance";

export function ReconciliationClient() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [accountId, setAccountId] = useState("");
  const [periods, setPeriods] = useState<StatementPeriodSummary[]>([]);
  const [adjustments, setAdjustments] = useState<BalanceAdjustmentRecord[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventRecord[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustMemo, setAdjustMemo] = useState("");
  const [adjustDate, setAdjustDate] = useState("");

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId) ?? null,
    [accounts, accountId]
  );

  const load = async (targetAccountId?: string) => {
    try {
      const resolvedAccountId = targetAccountId ?? accountId;
      const [accountsData, periodsData, adjustmentsData, auditData] =
        await Promise.all([
          fetchJson<AccountRecord[]>("/api/accounts"),
          fetchJson<StatementPeriodSummary[]>(
            `/api/reconciliation/periods${
              resolvedAccountId ? `?accountId=${resolvedAccountId}` : ""
            }`
          ),
          fetchJson<BalanceAdjustmentRecord[]>(
            `/api/balance-adjustments${
              resolvedAccountId ? `?accountId=${resolvedAccountId}` : ""
            }`
          ),
          fetchJson<AuditEventRecord[]>("/api/audit-events"),
        ]);
      setAccounts(accountsData);
      setPeriods(periodsData);
      setAdjustments(adjustmentsData);
      setAuditEvents(auditData);
      if (!accountId && accountsData.length) {
        setAccountId(accountsData[0].id);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load reconciliation.";
      toast.error(message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (accountId) {
      load(accountId);
    }
  }, [accountId]);

  const handleCreatePeriod = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accountId) {
      toast.error("Select an account first.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Start and end dates are required.");
      return;
    }
    try {
      await fetchJson("/api/reconciliation/periods", {
        method: "POST",
        body: JSON.stringify({
          accountId,
          startDate,
          endDate,
        }),
      });
      setStartDate("");
      setEndDate("");
      toast.success("Statement period created.");
      await load(accountId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create period.";
      toast.error(message);
    }
  };

  const toggleLock = async (period: StatementPeriodSummary) => {
    try {
      await fetchJson(`/api/reconciliation/periods/${period.id}`, {
        method: "PATCH",
        body: JSON.stringify({ locked: !period.locked }),
      });
      toast.success(period.locked ? "Period unlocked." : "Period locked.");
      await load(accountId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update period.";
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetchJson(`/api/reconciliation/periods/${id}`, { method: "DELETE" });
      toast.success("Period removed.");
      await load(accountId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete period.";
      toast.error(message);
    }
  };

  const handleAdjustment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accountId) {
      toast.error("Select an account first.");
      return;
    }
    const parsedAmount = Number.parseFloat(adjustAmount);
    if (Number.isNaN(parsedAmount) || parsedAmount === 0) {
      toast.error("Enter a non-zero adjustment amount.");
      return;
    }
    try {
      await fetchJson("/api/balance-adjustments", {
        method: "POST",
        body: JSON.stringify({
          accountId,
          amount: Math.round(parsedAmount * 100),
          memo: adjustMemo || null,
          effectiveDate: adjustDate || undefined,
        }),
      });
      setAdjustAmount("");
      setAdjustMemo("");
      setAdjustDate("");
      toast.success("Balance adjusted.");
      await load(accountId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to adjust balance.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Reconciliation</h1>
        <p className="text-sm text-muted-foreground">
          Track statement periods, lock reconciled ranges, and log adjustments.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-sm space-y-1">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedAccount ? (
            <div className="text-sm text-muted-foreground">
              Current balance: {formatCurrency(selectedAccount.currentBalance)}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create statement period</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleCreatePeriod}
            className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]"
          >
            <div className="space-y-1">
              <Label htmlFor="start-date">Start date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end-date">End date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">Add period</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statement checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {periods.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No statement periods yet.
            </p>
          ) : (
            periods.map((period) => (
              <div
                key={period.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    {period.startDate} → {period.endDate}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {period.totalCount} total · {period.clearedCount} cleared ·{" "}
                    {period.pendingCount} pending
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => toggleLock(period)}>
                    {period.locked ? "Unlock" : "Lock"}
                  </Button>
                  <Button variant="ghost" onClick={() => handleDelete(period.id)}>
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
          <CardTitle>Manual balance adjustment</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleAdjustment}
            className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <div className="space-y-1">
              <Label htmlFor="adjust-amount">Amount</Label>
              <Input
                id="adjust-amount"
                inputMode="decimal"
                value={adjustAmount}
                onChange={(event) => setAdjustAmount(event.target.value)}
                placeholder="25.00"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="adjust-date">Effective date</Label>
              <Input
                id="adjust-date"
                type="date"
                value={adjustDate}
                onChange={(event) => setAdjustDate(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="adjust-memo">Memo</Label>
              <Input
                id="adjust-memo"
                value={adjustMemo}
                onChange={(event) => setAdjustMemo(event.target.value)}
                placeholder="Statement correction"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">Apply adjustment</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent adjustments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {adjustments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No balance adjustments yet.
            </p>
          ) : (
            adjustments.map((adjustment) => (
              <div
                key={adjustment.id}
                className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{formatCurrency(adjustment.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {adjustment.effectiveDate} · {adjustment.memo ?? "No memo"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(adjustment.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No audit activity yet.
            </p>
          ) : (
            auditEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    {event.entityType} · {event.action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.entityId ?? "System"} ·{" "}
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
