"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

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
import { formatCurrency, parseAmountToCents } from "@/lib/format";
import type { AccountRecord, TransactionWithRelations } from "@/types/finance";

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

type QuickAccountDraft = {
  id: string;
  name: string;
  type: string;
  last4: string;
  startingBalance: string;
  creditLimit: string;
  apr: string;
  statementCloseDay: string;
  statementDueDay: string;
};

const createQuickAccountDraft = (): QuickAccountDraft => ({
  id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  name: "",
  type: "checking",
  last4: "",
  startingBalance: "",
  creditLimit: "",
  apr: "",
  statementCloseDay: "",
  statementDueDay: "",
});

export function AccountsClient() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>(
    []
  );
  const quickFormRef = useRef<HTMLDivElement>(null);
  const quickInstitutionRef = useRef<HTMLInputElement>(null);
  const [quickInstitution, setQuickInstitution] = useState("");
  const [quickAccounts, setQuickAccounts] = useState<QuickAccountDraft[]>([
    createQuickAccountDraft(),
  ]);
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
        const [accountsData, transactionsData] = await Promise.all([
          fetchJson<AccountRecord[]>("/api/accounts"),
          fetchJson<TransactionWithRelations[]>("/api/transactions"),
        ]);
        setAccounts(accountsData);
        setTransactions(transactionsData);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load accounts.";
        toast.error(message);
      }
    };
    load();
  }, []);

  const resetQuickAccounts = () => {
    setQuickInstitution("");
    setQuickAccounts([createQuickAccountDraft()]);
  };

  const handleEditGroup = (institutionName: string) => {
    setQuickInstitution(institutionName === "Unassigned" ? "" : institutionName);
    setQuickAccounts((prev) => {
      const hasEmpty = prev.some((entry) => !entry.name.trim());
      return hasEmpty ? prev : [...prev, createQuickAccountDraft()];
    });
    quickFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => quickInstitutionRef.current?.focus(), 0);
  };

  const handleQuickSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!quickInstitution.trim()) {
      toast.error("Bank name is required.");
      return;
    }
    const prepared = quickAccounts
      .map((draft) => ({
        draft,
        payload: {
          name: draft.name.trim(),
          type: draft.type,
          institution: quickInstitution.trim(),
          last4:
            draft.last4.trim().length === 4 ? draft.last4.trim() : undefined,
          startingBalance: parseAmountToCents(draft.startingBalance) ?? undefined,
          creditLimit: parseAmountToCents(draft.creditLimit) ?? undefined,
          apr: draft.apr ? Number.parseFloat(draft.apr) : undefined,
          statementCloseDay: draft.statementCloseDay
            ? Number.parseInt(draft.statementCloseDay, 10)
            : undefined,
          statementDueDay: draft.statementDueDay
            ? Number.parseInt(draft.statementDueDay, 10)
            : undefined,
        },
      }))
      .filter((entry) => entry.payload.name.length > 0);
    if (prepared.length === 0) {
      toast.error("Add at least one account.");
      return;
    }
    try {
      const results = await Promise.allSettled(
        prepared.map((entry) =>
          fetchJson<AccountRecord>("/api/accounts", {
            method: "POST",
            body: JSON.stringify(entry.payload),
          })
        )
      );
      const created: AccountRecord[] = [];
      const failedDrafts: QuickAccountDraft[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          created.push(result.value);
        } else {
          failedDrafts.push(prepared[index].draft);
        }
      });
      if (created.length) {
        setAccounts((prev) => [...prev, ...created]);
      }
      if (failedDrafts.length) {
        setQuickAccounts(failedDrafts);
        toast.error(
          `Added ${created.length} account${
            created.length === 1 ? "" : "s"
          }, ${failedDrafts.length} failed.`
        );
        return;
      }
      resetQuickAccounts();
      toast.success("Accounts added.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create accounts.";
      toast.error(message);
    }
  };

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

  const transactionsByAccount = useMemo(() => {
    const map = new Map<string, TransactionWithRelations[]>();
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    transactions.forEach((tx) => {
      const date = new Date(tx.date);
      if (date < start) {
        return;
      }
      const list = map.get(tx.accountId) ?? [];
      list.push(tx);
      map.set(tx.accountId, list);
    });
    return map;
  }, [transactions]);

  const accountsByInstitution = useMemo(() => {
    const map = new Map<string, AccountRecord[]>();
    accounts.forEach((account) => {
      const key = account.institution?.trim() || "Unassigned";
      const list = map.get(key) ?? [];
      list.push(account);
      map.set(key, list);
    });
    return Array.from(map.entries())
      .map(([institutionName, items]) => ({
        institutionName,
        accounts: items.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => {
        if (a.institutionName === "Unassigned") {
          return 1;
        }
        if (b.institutionName === "Unassigned") {
          return -1;
        }
        return a.institutionName.localeCompare(b.institutionName);
      });
  }, [accounts]);

  const renderSparkline = (
    items: TransactionWithRelations[],
    accountType: string
  ) => {
    if (!items.length) {
      return (
        <svg width="120" height="32" viewBox="0 0 120 32">
          <line x1="0" y1="16" x2="120" y2="16" stroke="currentColor" strokeOpacity="0.2" />
        </svg>
      );
    }
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    const daily = Array.from({ length: 30 }).map(() => 0);
    items.forEach((tx) => {
      const date = new Date(tx.date);
      const index = Math.floor((date.getTime() - start.getTime()) / 86400000);
      if (index < 0 || index >= daily.length) {
        return;
      }
      const isIncome = tx.category?.kind === "income";
      const delta = isIncome ? tx.amount : -tx.amount;
      daily[index] += accountType === "credit" ? -delta : delta;
    });
    const series = daily.reduce<number[]>((acc, value) => {
      const last = acc.length ? acc[acc.length - 1] : 0;
      acc.push(last + value);
      return acc;
    }, []);
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    const points = series
      .map((value, index) => {
        const x = (index / (series.length - 1)) * 120;
        const y = 28 - ((value - min) / range) * 24;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return (
      <svg width="120" height="32" viewBox="0 0 120 32">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Monitor balances, utilization, and sync health."
      />

      <Card ref={quickFormRef}>
        <CardHeader>
          <CardTitle>Add bank + accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleQuickSubmit} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="space-y-1">
                <Label htmlFor="quick-institution">Bank or institution</Label>
                <Input
                  id="quick-institution"
                  ref={quickInstitutionRef}
                  value={quickInstitution}
                  onChange={(event) => setQuickInstitution(event.target.value)}
                  placeholder="Citizens Bank"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setQuickAccounts((prev) => [
                      ...prev,
                      createQuickAccountDraft(),
                    ])
                  }
                >
                  Add another
                </Button>
                <Button type="submit">Add accounts</Button>
              </div>
            </div>

            <div className="space-y-3">
              {quickAccounts.map((draft, index) => (
                <div
                  key={draft.id}
                  className="space-y-3 rounded-lg border bg-background p-3"
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_200px_140px_auto] lg:items-end">
                    <div className="space-y-1">
                      <Label
                        htmlFor={`quick-name-${draft.id}`}
                        className={index === 0 ? "" : "sr-only"}
                      >
                        Account name
                      </Label>
                      <Input
                        id={`quick-name-${draft.id}`}
                        value={draft.name}
                        onChange={(event) =>
                          setQuickAccounts((prev) =>
                            prev.map((entry) =>
                              entry.id === draft.id
                                ? { ...entry, name: event.target.value }
                                : entry
                            )
                          )
                        }
                        placeholder="Checking, Savings 1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className={index === 0 ? "" : "sr-only"}>Type</Label>
                      <Select
                        value={draft.type}
                        onValueChange={(value) =>
                          setQuickAccounts((prev) =>
                            prev.map((entry) =>
                              entry.id === draft.id
                                ? { ...entry, type: value }
                                : entry
                            )
                          )
                        }
                      >
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
                    <div className="space-y-1">
                      <Label
                        htmlFor={`quick-last4-${draft.id}`}
                        className={index === 0 ? "" : "sr-only"}
                      >
                        Last 4
                      </Label>
                      <Input
                        id={`quick-last4-${draft.id}`}
                        value={draft.last4}
                        onChange={(event) =>
                          setQuickAccounts((prev) =>
                            prev.map((entry) =>
                              entry.id === draft.id
                                ? { ...entry, last4: event.target.value }
                                : entry
                            )
                          )
                        }
                        placeholder="1234"
                        maxLength={4}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setQuickAccounts((prev) =>
                            prev.length === 1
                              ? prev
                              : prev.filter((entry) => entry.id !== draft.id)
                          )
                        }
                        disabled={quickAccounts.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1">
                      <Label htmlFor={`quick-balance-${draft.id}`}>
                        {draft.type === "credit"
                          ? "Current balance"
                          : "Balance"}
                      </Label>
                      <Input
                        id={`quick-balance-${draft.id}`}
                        inputMode="decimal"
                        value={draft.startingBalance}
                        onChange={(event) =>
                          setQuickAccounts((prev) =>
                            prev.map((entry) =>
                              entry.id === draft.id
                                ? {
                                    ...entry,
                                    startingBalance: event.target.value,
                                  }
                                : entry
                            )
                          )
                        }
                        placeholder="2500.00"
                      />
                    </div>
                    {draft.type === "credit" ? (
                      <>
                        <div className="space-y-1">
                          <Label htmlFor={`quick-limit-${draft.id}`}>
                            Credit limit
                          </Label>
                          <Input
                            id={`quick-limit-${draft.id}`}
                            inputMode="decimal"
                            value={draft.creditLimit}
                            onChange={(event) =>
                              setQuickAccounts((prev) =>
                                prev.map((entry) =>
                                  entry.id === draft.id
                                    ? {
                                        ...entry,
                                        creditLimit: event.target.value,
                                      }
                                    : entry
                                )
                              )
                            }
                            placeholder="5000.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`quick-apr-${draft.id}`}>APR (%)</Label>
                          <Input
                            id={`quick-apr-${draft.id}`}
                            inputMode="decimal"
                            value={draft.apr}
                            onChange={(event) =>
                              setQuickAccounts((prev) =>
                                prev.map((entry) =>
                                  entry.id === draft.id
                                    ? { ...entry, apr: event.target.value }
                                    : entry
                                )
                              )
                            }
                            placeholder="19.99"
                          />
                        </div>
                      </>
                    ) : null}
                  </div>

                  {draft.type === "credit" ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={`quick-close-${draft.id}`}>
                          Statement close day
                        </Label>
                        <Input
                          id={`quick-close-${draft.id}`}
                          inputMode="numeric"
                          value={draft.statementCloseDay}
                          onChange={(event) =>
                            setQuickAccounts((prev) =>
                              prev.map((entry) =>
                                entry.id === draft.id
                                  ? {
                                      ...entry,
                                      statementCloseDay: event.target.value,
                                    }
                                  : entry
                              )
                            )
                          }
                          placeholder="25"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`quick-due-${draft.id}`}>
                          Statement due day
                        </Label>
                        <Input
                          id={`quick-due-${draft.id}`}
                          inputMode="numeric"
                          value={draft.statementDueDay}
                          onChange={(event) =>
                            setQuickAccounts((prev) =>
                              prev.map((entry) =>
                                entry.id === draft.id
                                  ? {
                                      ...entry,
                                      statementDueDay: event.target.value,
                                    }
                                  : entry
                              )
                            )
                          }
                          placeholder="15"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-strong">
              Group accounts under one bank so setup is quick for savings,
              checking, and credit.
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add single account (detailed)</CardTitle>
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
            <div className="flex items-center gap-3">
              {syncing ? (
                <span className="text-xs text-muted-strong">Syncing...</span>
              ) : null}
              <Button
                onClick={() => handleSync()}
                disabled={syncing || accounts.length === 0}
              >
                Sync all
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length === 0 ? (
            <EmptyState
              title="No accounts yet"
              description="Add checking and credit cards to power utilization."
            />
          ) : (
            <div className="space-y-4">
              {accountsByInstitution.map((group) => {
                const groupTotal = group.accounts.reduce(
                  (sum, account) => sum + account.currentBalance,
                  0
                );
                return (
                  <div
                    key={group.institutionName}
                    className="rounded-2xl border bg-muted/10 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold">
                          {group.institutionName}
                        </p>
                        <p className="text-xs text-muted-strong">
                          {group.accounts.length} account
                          {group.accounts.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-strong">
                            Total balance
                          </p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(groupTotal)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditGroup(group.institutionName)}
                          title="Add or manage accounts"
                          aria-label={`Edit ${group.institutionName}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      {group.accounts.map((account) => {
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
                        const sparkline = renderSparkline(
                          transactionsByAccount.get(account.id) ?? [],
                          account.type
                        );
                        return (
                          <div
                            key={account.id}
                            className="rounded-xl border bg-background p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-lg font-semibold">
                                  {account.name}
                                </p>
                                <p className="text-xs text-muted-strong">
                                  {account.type}
                                  {account.last4 ? ` · ${account.last4}` : ""}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-strong">
                                <div className="text-foreground">
                                  {sparkline}
                                </div>
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
                                  title={
                                    account.syncError
                                      ? account.syncError
                                      : statusLabel
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
                                <p className="text-xs text-muted-strong">
                                  Balance
                                </p>
                                <p className="text-lg font-semibold">
                                  {formatCurrency(balance)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-strong">
                                  {isCredit
                                    ? "Available credit"
                                    : "Available"}
                                </p>
                                <p className="text-lg font-semibold">
                                  {formatCurrency(available)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-strong">
                                  Statement close
                                </p>
                                <p className="font-medium">
                                  {dayToLabel(account.statementCloseDay)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-strong">
                                  Statement due
                                </p>
                                <p className="font-medium">
                                  {dayToLabel(account.statementDueDay)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-strong">
                                  Last updated
                                </p>
                                <p className="font-medium">
                                  {formatRelative(account.lastSyncAt)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                              <div className="text-xs text-muted-strong">
                                Sync health:{" "}
                                <span title={account.syncError ?? ""}>
                                  {account.syncError
                                    ? account.syncError
                                    : "All clear"}
                                </span>
                              </div>
                              {account.rewardCurrency ? (
                                <Badge variant="outline">
                                  Rewards: {account.rewardCurrency}
                                </Badge>
                              ) : null}
                            </div>

                            {utilization !== null ? (
                              <div className="mt-4">
                                <div className="flex items-center justify-between text-xs text-muted-strong">
                                  <span>Utilization</span>
                                  <span>
                                    {(utilization * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="mt-1 h-2 w-full rounded-full bg-muted">
                                  <div
                                    className={`h-2 rounded-full ${
                                      utilization >= 0.3
                                        ? "bg-rose-500"
                                        : "bg-emerald-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(
                                        utilization * 100,
                                        100
                                      )}%`,
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
