"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/api-client";
import { accountTypes } from "@/lib/validators";
import { formatCurrency } from "@/lib/format";
import type { AccountRecord } from "@/types/finance";

const dayToLabel = (day: number | null) => {
  if (!day) {
    return "—";
  }
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), day);
  if (target < now) {
    target.setMonth(target.getMonth() + 1);
  }
  return target.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatRelative = (date: string | null) => {
  if (!date) {
    return "Never";
  }
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export function AccountsClient() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("checking");
  const [institution, setInstitution] = useState("");
  const [last4, setLast4] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [apr, setApr] = useState("");
  const [statementCloseDay, setStatementCloseDay] = useState("");
  const [statementDueDay, setStatementDueDay] = useState("");
  const [rewardCurrency, setRewardCurrency] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchJson<AccountRecord[]>("/api/accounts");
        setAccounts(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load accounts.";
        toast.error(message);
      }
    };
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    const parsedLimit = creditLimit ? Number.parseFloat(creditLimit) : null;
    const parsedApr = apr ? Number.parseFloat(apr) : null;
    const parsedCloseDay = statementCloseDay
      ? Number.parseInt(statementCloseDay, 10)
      : null;
    const parsedDueDay = statementDueDay
      ? Number.parseInt(statementDueDay, 10)
      : null;
    try {
      const account = await fetchJson<AccountRecord>("/api/accounts", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          type,
          institution: institution.trim() || undefined,
          last4: last4.trim() || undefined,
          creditLimit: parsedLimit ? Math.round(parsedLimit * 100) : undefined,
          apr: parsedApr ?? undefined,
          statementCloseDay: parsedCloseDay ?? undefined,
          statementDueDay: parsedDueDay ?? undefined,
          rewardCurrency: rewardCurrency.trim() || undefined,
        }),
      });
      setAccounts((prev) => [...prev, account]);
      setName("");
      setInstitution("");
      setLast4("");
      setCreditLimit("");
      setApr("");
      setStatementCloseDay("");
      setStatementDueDay("");
      setRewardCurrency("");
      toast.success("Account created.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create account.";
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetchJson(`/api/accounts/${id}`, { method: "DELETE" });
      setAccounts((prev) => prev.filter((account) => account.id !== id));
      toast.success("Account removed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete account.";
      toast.error(message);
    }
  };

  const handleSync = async (accountId?: string) => {
    setSyncing(true);
    try {
      const updated = await fetchJson<AccountRecord[]>("/api/accounts/sync", {
        method: "POST",
        body: JSON.stringify(accountId ? { accountId } : {}),
      });
      if (accountId) {
        setAccounts((prev) =>
          prev.map((account) =>
            account.id === accountId
              ? updated.find((item) => item.id === accountId) ?? account
              : account
          )
        );
      } else {
        setAccounts(updated);
      }
      toast.success("Balances refreshed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sync balances.";
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  };

  const healthSummary = useMemo(
    () =>
      accounts.map((account) => {
        const lastSync = account.lastSyncAt
          ? new Date(account.lastSyncAt).getTime()
          : null;
        const stale =
          lastSync === null ? true : Date.now() - lastSync > 1000 * 60 * 60 * 24;
        return { id: account.id, stale };
      }),
    [accounts]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Monitor balances, utilization, and sync health."
      />

      <Card>
        <CardHeader>
          <CardTitle>Add account</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 lg:grid-cols-[1fr_200px_auto]"
          >
            <div className="space-y-1">
              <Label htmlFor="account-name">Account name</Label>
              <Input
                id="account-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Checking, Savings, Credit Card"
              />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((accountType) => (
                    <SelectItem key={accountType} value={accountType}>
                      {accountType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit">Add account</Button>
            </div>
            <div className="space-y-1">
              <Label htmlFor="account-institution">Institution</Label>
              <Input
                id="account-institution"
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
                placeholder="Chase, Wells Fargo"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="account-last4">Last 4</Label>
              <Input
                id="account-last4"
                value={last4}
                onChange={(event) => setLast4(event.target.value)}
                placeholder="1234"
                maxLength={4}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="account-limit">Credit limit</Label>
              <Input
                id="account-limit"
                inputMode="decimal"
                value={creditLimit}
                onChange={(event) => setCreditLimit(event.target.value)}
                placeholder="5000.00"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="account-apr">APR (%)</Label>
              <Input
                id="account-apr"
                inputMode="decimal"
                value={apr}
                onChange={(event) => setApr(event.target.value)}
                placeholder="19.99"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="account-close">Statement close day</Label>
              <Input
                id="account-close"
                inputMode="numeric"
                value={statementCloseDay}
                onChange={(event) => setStatementCloseDay(event.target.value)}
                placeholder="25"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="account-due">Statement due day</Label>
              <Input
                id="account-due"
                inputMode="numeric"
                value={statementDueDay}
                onChange={(event) => setStatementDueDay(event.target.value)}
                placeholder="15"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="account-reward">Rewards currency</Label>
              <Input
                id="account-reward"
                value={rewardCurrency}
                onChange={(event) => setRewardCurrency(event.target.value)}
                placeholder="Points, Miles"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Account dashboard</CardTitle>
            <Button
              variant="outline"
              onClick={() => handleSync()}
              disabled={syncing || accounts.length === 0}
            >
              Sync balances
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.length === 0 ? (
            <EmptyState
              title="No accounts yet"
              description="Add checking and credit cards to power utilization."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {accounts.map((account) => {
                const isCredit = account.type === "credit";
                const balance = account.currentBalance;
                const available =
                  isCredit && account.creditLimit
                    ? account.availableCredit ??
                      account.creditLimit - Math.abs(balance)
                    : account.availableBalance ?? balance;
                const utilization =
                  isCredit && account.creditLimit
                    ? Math.abs(balance) / account.creditLimit
                    : null;
                const staleFlag = healthSummary.find(
                  (item) => item.id === account.id
                )?.stale;
                const statusLabel =
                  account.syncStatus === "ok"
                    ? "Healthy"
                    : account.syncStatus === "pending"
                    ? "MFA required"
                    : account.syncStatus === "error"
                    ? "Error"
                    : account.syncStatus === "disconnected"
                    ? "Disconnected"
                    : "Manual";
                return (
                  <div
                    key={account.id}
                    className="rounded-xl border bg-muted/10 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-lg font-semibold">{account.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {account.type} ·{" "}
                          {account.institution
                            ? account.institution
                            : "Unassigned"}{" "}
                          {account.last4 ? `· ${account.last4}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={
                            account.syncStatus === "ok"
                              ? "bg-emerald-100 text-emerald-700"
                              : account.syncStatus === "error"
                              ? "bg-rose-100 text-rose-700"
                              : account.syncStatus === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-muted text-foreground"
                          }
                        >
                          {statusLabel}
                        </Badge>
                        {staleFlag ? (
                          <Badge variant="outline">Stale</Badge>
                        ) : (
                          <Badge variant="outline">Fresh</Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(balance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {isCredit ? "Available credit" : "Available"}
                        </p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(available)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Statement close
                        </p>
                        <p className="font-medium">
                          {dayToLabel(account.statementCloseDay)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Statement due
                        </p>
                        <p className="font-medium">
                          {dayToLabel(account.statementDueDay)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        Last sync: {formatRelative(account.lastSyncAt)}
                        {account.syncError ? ` · ${account.syncError}` : ""}
                      </div>
                      {account.rewardCurrency ? (
                        <Badge variant="outline">
                          Rewards: {account.rewardCurrency}
                        </Badge>
                      ) : null}
                    </div>

                    {utilization !== null ? (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Utilization</span>
                          <span>{(utilization * 100).toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-muted">
                          <div
                            className={`h-2 rounded-full ${
                              utilization >= 0.3
                                ? "bg-rose-500"
                                : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${Math.min(utilization * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleSync(account.id)}
                        disabled={syncing}
                      >
                        Sync now
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(account.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
