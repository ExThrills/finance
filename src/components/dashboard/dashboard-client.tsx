"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/api-client";
import { chartAccent, chartPalette, chartPrimary } from "@/lib/chart-colors";
import { formatCurrency } from "@/lib/format";
import type {
  AccountRecord,
  AlertRecord,
  BudgetWithActuals,
  CategoryRecord,
  TransactionWithRelations,
} from "@/types/finance";
import { useAccountScope } from "@/components/account-scope-context";

function monthKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DashboardClient() {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithActuals[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loadingSampleData, setLoadingSampleData] = useState(false);
  const [nextStepsDismissed, setNextStepsDismissed] = useState(false);
  const { scope } = useAccountScope();

  const loadDashboard = useCallback(async () => {
    try {
      const [txData, accountsData, categoriesData, budgetsData, alertsData] =
        await Promise.all([
          fetchJson<TransactionWithRelations[]>("/api/transactions"),
          fetchJson<AccountRecord[]>("/api/accounts"),
          fetchJson<CategoryRecord[]>("/api/categories"),
          fetchJson<BudgetWithActuals[]>("/api/budgets"),
          fetchJson<AlertRecord[]>("/api/alerts"),
        ]);
      setTransactions(txData);
      setAccounts(accountsData);
      setCategories(categoriesData);
      setBudgets(budgetsData);
      setAlerts(alertsData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load dashboard.";
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const dismissed = window.localStorage.getItem("dashboardNextStepsDismissed");
    if (dismissed === "true") {
      setNextStepsDismissed(true);
    }
  }, []);

  const monthOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      return {
        value: monthKey(date),
        label: date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      };
    });
  }, []);

  const monthStart = useMemo(() => {
    const [year, monthStr] = month.split("-").map(Number);
    return new Date(year, monthStr - 1, 1);
  }, [month]);

  const monthEnd = useMemo(() => {
    const [year, monthStr] = month.split("-").map(Number);
    return new Date(year, monthStr, 0, 23, 59, 59);
  }, [month]);

  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );

  const scopedAccounts = useMemo(() => {
    if (scope.kind === "all") {
      return accounts;
    }
    if (scope.kind === "account") {
      return accounts.filter((account) => account.id === scope.value);
    }
    if (scope.kind === "type") {
      return accounts.filter((account) => account.type === scope.value);
    }
    if (scope.kind === "institution") {
      return accounts.filter(
        (account) => account.institution === scope.value
      );
    }
    return accounts;
  }, [accounts, scope]);

  const scopedTransactions = useMemo(() => {
    if (scope.kind === "all") {
      return transactions;
    }
    if (scope.kind === "account") {
      return transactions.filter((tx) => tx.accountId === scope.value);
    }
    if (scope.kind === "type") {
      return transactions.filter((tx) => {
        const account = accountById.get(tx.accountId);
        return account?.type === scope.value;
      });
    }
    if (scope.kind === "institution") {
      return transactions.filter((tx) => {
        const account = accountById.get(tx.accountId);
        return account?.institution === scope.value;
      });
    }
    return transactions;
  }, [accountById, scope, transactions]);

  const cashOnHand = useMemo(() => {
    return scopedAccounts
      .filter((account) =>
        ["checking", "savings", "cash"].includes(account.type)
      )
      .reduce((sum, account) => sum + (account.currentBalance || 0), 0);
  }, [scopedAccounts]);

  const upcomingBills = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    const upcoming = scopedTransactions.filter((tx) => {
      const date = new Date(tx.date);
      return (
        date >= start &&
        date <= end &&
        tx.category?.kind === "expense"
      );
    });
    const total = upcoming.reduce((sum, tx) => sum + tx.amount, 0);
    return { count: upcoming.length, total };
  }, [scopedTransactions]);

  const monthTransactions = useMemo(() => {
    return scopedTransactions.filter((tx) => {
      const date = new Date(tx.date);
      return date >= monthStart && date <= monthEnd;
    });
  }, [monthEnd, monthStart, scopedTransactions]);

  const { incomeTotal, expenseTotal, netTotal } = useMemo(() => {
    return monthTransactions.reduce(
      (totals, tx) => {
        const isIncome = tx.category?.kind === "income";
        if (isIncome) {
          totals.incomeTotal += tx.amount;
        } else {
          totals.expenseTotal += tx.amount;
        }
        totals.netTotal += isIncome ? tx.amount : -tx.amount;
        return totals;
      },
      { incomeTotal: 0, expenseTotal: 0, netTotal: 0 }
    );
  }, [monthTransactions]);

  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    monthTransactions.forEach((tx) => {
      if (tx.category?.kind !== "expense") {
        return;
      }
      const name = tx.category?.name ?? "Uncategorized";
      map.set(name, (map.get(name) ?? 0) + tx.amount);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  const dailyCashflow = useMemo(() => {
    const daysInMonth = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0
    ).getDate();
    const buckets = Array.from({ length: daysInMonth }).map((_, index) => ({
      day: String(index + 1),
      net: 0,
    }));
    monthTransactions.forEach((tx) => {
      const date = new Date(tx.date);
      const dayIndex = date.getDate() - 1;
      const isIncome = tx.category?.kind === "income";
      buckets[dayIndex].net += isIncome ? tx.amount : -tx.amount;
    });
    return buckets;
  }, [monthStart, monthTransactions]);

  const averageDaily = useMemo(() => {
    if (!dailyCashflow.length) {
      return 0;
    }
    const total = dailyCashflow.reduce((sum, day) => sum + day.net, 0);
    return total / dailyCashflow.length;
  }, [dailyCashflow]);

  const barData = useMemo(
    () => [
      { name: "Income", value: incomeTotal },
      { name: "Expenses", value: expenseTotal },
    ],
    [incomeTotal, expenseTotal]
  );

  const topCategories = useMemo(() => pieData.slice(0, 3), [pieData]);

  const creditAccounts = useMemo(
    () =>
      scopedAccounts.filter(
        (account) => account.type === "credit" && account.creditLimit
      ),
    [scopedAccounts]
  );

  const { totalLimit, totalBalance, overallUtilization } = useMemo(() => {
    const totals = creditAccounts.reduce(
      (acc, account) => {
        acc.totalLimit += account.creditLimit ?? 0;
        acc.totalBalance += Math.abs(account.currentBalance);
        return acc;
      },
      { totalLimit: 0, totalBalance: 0 }
    );
    return {
      ...totals,
      overallUtilization:
        totals.totalLimit > 0 ? totals.totalBalance / totals.totalLimit : 0,
    };
  }, [creditAccounts]);

  const alertsPreview = useMemo(() => alerts.slice(0, 5), [alerts]);

  const budgetPreview = useMemo(() => budgets.slice(0, 3), [budgets]);

  const recentByAccount = useMemo(() => {
    const map = new Map<string, TransactionWithRelations>();
    scopedTransactions.forEach((tx) => {
      const existing = map.get(tx.accountId);
      if (!existing || new Date(tx.date) > new Date(existing.date)) {
        map.set(tx.accountId, tx);
      }
    });
    return map;
  }, [scopedTransactions]);

  const checklistItems = useMemo(
    () => [
      {
        id: "account",
        label: "Complete setup hub",
        complete: accounts.length > 0,
      },
      {
        id: "category",
        label: "Add categories",
        complete: categories.length > 0,
      },
      {
        id: "transaction",
        label: "Add your first transaction",
        complete: transactions.length > 0,
      },
      {
        id: "budget",
        label: "Create a budget",
        complete: budgets.length > 0,
        optional: true,
      },
    ],
    [accounts.length, budgets.length, categories.length, transactions.length]
  );

  const checklistCompleteCount = checklistItems.filter((item) => item.complete).length;
  const checklistComplete = checklistItems.every(
    (item) => item.complete || item.optional === true
  );
  const canLoadSampleData =
    accounts.length === 0 &&
    categories.length === 0 &&
    transactions.length === 0 &&
    budgets.length === 0;

  const handleLoadSampleData = async () => {
    setLoadingSampleData(true);
    try {
      await fetchJson("/api/sample-data", { method: "POST" });
      toast.success("Sample data loaded.");
      await loadDashboard();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load sample data.";
      toast.error(message);
    } finally {
      setLoadingSampleData(false);
    }
  };

  const handleDismissNextSteps = () => {
    setNextStepsDismissed(true);
    window.localStorage.setItem("dashboardNextStepsDismissed", "true");
  };

  const chartGridClass =
    budgets.length > 0 ? "lg:grid-cols-3" : "lg:grid-cols-2";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Snapshot of your cashflow and spending patterns."
        actions={
          <>
            <span className="text-sm text-muted-foreground">Month</span>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Financial health</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Net cashflow
            </p>
            <p className="text-2xl font-semibold">{formatCurrency(netTotal)}</p>
            <p className="text-xs text-muted-strong">This month</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Cash on hand
            </p>
            <p className="text-2xl font-semibold">{formatCurrency(cashOnHand)}</p>
            <p className="text-xs text-muted-strong">Checking + savings</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Credit utilization
            </p>
            <p className="text-2xl font-semibold">
              {totalLimit > 0 ? `${(overallUtilization * 100).toFixed(1)}%` : "—"}
            </p>
            <p className="text-xs text-muted-strong">
              {totalLimit > 0
                ? `${formatCurrency(totalBalance)} / ${formatCurrency(totalLimit)}`
                : "No credit limits"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Upcoming bills
            </p>
            <p className="text-2xl font-semibold">
              {formatCurrency(upcomingBills.total)}
            </p>
            <p className="text-xs text-muted-strong">
              {upcomingBills.count} in next 7 days
            </p>
          </div>
        </CardContent>
      </Card>

      {!checklistComplete ? (
        <Card>
          <CardHeader>
            <CardTitle>First-run checklist</CardTitle>
            <p className="text-sm text-muted-foreground">
              {checklistCompleteCount} of {checklistItems.length} complete
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {item.complete ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={item.complete ? "text-muted-foreground line-through" : ""}>
                      {item.label}
                    </span>
                    {item.optional ? (
                      <span className="text-xs text-muted-strong">(optional)</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
              <div>
                New here? The setup hub walks you through accounts, categories, and recurring
                items.
              </div>
              <Button asChild variant="outline">
                <Link href="/setup">Open setup hub</Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
              <div>
                Prefer a guided tour? Load a safe set of sample accounts and transactions.
                {!canLoadSampleData ? " Sample data is only available for empty workspaces." : ""}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleLoadSampleData}
                disabled={!canLoadSampleData || loadingSampleData}
              >
                {loadingSampleData ? "Loading..." : "Load sample data"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!nextStepsDismissed ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>What to do next</CardTitle>
              <p className="text-sm text-muted-foreground">
                Keep going with the next high-impact actions.
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleDismissNextSteps}>
              Dismiss
            </Button>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/setup">Open setup hub</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/categories">Add categories</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/transactions">Add a transaction</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/budgets">Create a budget</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {transactions.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Add a transaction to see income, expense, and cashflow insights."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Income</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {formatCurrency(incomeTotal)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Expenses</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-rose-700">
              {formatCurrency(expenseTotal)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Net</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {formatCurrency(netTotal)}
            </CardContent>
          </Card>
        </div>
      )}

      <div className={`grid gap-6 ${chartGridClass}`}>
        <Card>
        <CardHeader>
          <CardTitle>Spending by category</CardTitle>
          <p className="text-xs text-muted-strong">
            Total expenses: {formatCurrency(expenseTotal)}
          </p>
        </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                  >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`${entry.name}-${index}`}
                      fill={chartPalette[index % chartPalette.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 text-xs text-muted-strong">
              {topCategories.length === 0 ? (
                <span>No expense categories yet.</span>
              ) : (
                topCategories.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: chartPalette[index % chartPalette.length] }}
                      />
                      <span>{entry.name}</span>
                    </div>
                    <span>{formatCurrency(entry.value)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
        <CardHeader>
          <CardTitle>Monthly cashflow</CardTitle>
          <p className="text-xs text-muted-strong">
            Net for {monthOptions.find((option) => option.value === month)?.label ?? "this month"}
          </p>
        </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyCashflow}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis tickFormatter={(value) => `$${value / 100}`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke={chartPrimary}
                  strokeWidth={2}
                  dot={false}
                />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-strong">
              <span>Net this month</span>
              <span className={netTotal < 0 ? "text-rose-700" : "text-emerald-700"}>
                {formatCurrency(netTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-strong">
              <span>Avg daily</span>
              <span>{formatCurrency(averageDaily)}</span>
            </div>
          </CardContent>
        </Card>

        {budgets.length > 0 ? (
          <Card>
        <CardHeader>
          <CardTitle>Budget burn-down</CardTitle>
          <p className="text-xs text-muted-strong">
            {budgetPreview.length} active budgets
          </p>
        </CardHeader>
            <CardContent className="space-y-4">
              {budgetPreview.map((budget) => {
                const percent = Math.min(budget.percentUsed, 200);
                const remaining = Math.max(budget.targetAmount - budget.actualAmount, 0);
                return (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{budget.name}</span>
                      <span className="text-xs text-muted-strong">
                        {formatCurrency(remaining)} left
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${
                          budget.percentUsed >= 100 ? "bg-rose-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-strong">
                      <span>
                        {formatCurrency(budget.actualAmount)} of {formatCurrency(budget.targetAmount)}
                      </span>
                      <span>{budget.percentUsed}%</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income vs expenses</CardTitle>
          <p className="text-xs text-muted-strong">
            {formatCurrency(incomeTotal)} in · {formatCurrency(expenseTotal)} out
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${value / 100}`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="value" fill={chartAccent} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-strong">
            <span>Income</span>
            <span className="text-emerald-700">{formatCurrency(incomeTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-strong">
            <span>Expenses</span>
            <span className="text-rose-700">{formatCurrency(expenseTotal)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerts timeline</CardTitle>
          <p className="text-xs text-muted-strong">
            Latest {alertsPreview.length} alerts
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {alertsPreview.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No alerts in the last 30 days.
            </p>
          ) : (
            alertsPreview.map((alert) => {
              const severity = alert.rule?.severity ?? "low";
              const severityClasses =
                severity === "high"
                  ? "bg-rose-100 text-rose-700"
                  : severity === "medium"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700";
              return (
                <div
                  key={alert.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/10 px-3 py-2"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-strong">
                      {formatShortDate(alert.createdAt)}
                      {alert.acknowledgedAt ? " · Acknowledged" : ""}
                    </p>
                  </div>
                  <Badge className={severityClasses}>{severity}</Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Card dashboard</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {creditAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No credit cards in this scope.
            </p>
          ) : (
            creditAccounts.map((account) => {
              const balance = Math.abs(account.currentBalance);
              const limit = account.creditLimit ?? 0;
              const utilization = limit ? balance / limit : 0;
              const recent = recentByAccount.get(account.id);
              return (
                <div
                  key={account.id}
                  className="rounded-xl border bg-muted/20 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold">{account.name}</p>
                      <p className="text-xs text-muted-strong">
                        {account.institution ?? "Unassigned"}
                        {account.last4 ? ` · ${account.last4}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        utilization >= 0.3 ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      {(utilization * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-strong">Balance</p>
                      <p className="font-semibold">{formatCurrency(balance)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-strong">
                        Available credit
                      </p>
                      <p className="font-semibold">
                        {formatCurrency(
                          account.availableCredit ??
                            (limit ? limit - balance : 0)
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-strong">Rewards</p>
                      <p className="font-semibold">
                        {account.rewardCurrency ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-strong">
                        Statement due
                      </p>
                      <p className="font-semibold">
                        {account.statementDueDay ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-strong">
                    Recent activity:{" "}
                    {recent
                      ? `${recent.description} · ${formatCurrency(recent.amount)}`
                      : "No recent activity"}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
            <CardTitle>Credit utilization</CardTitle>
            <p className="text-xs text-muted-strong">
              What is utilization? Balance divided by credit limit.
            </p>
          </CardHeader>
        <CardContent className="space-y-3">
          {creditAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No credit accounts yet.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">Overall</span>
                  <p className="text-xs text-muted-strong">
                    {formatCurrency(totalBalance)} / {formatCurrency(totalLimit)}
                  </p>
                </div>
                <span className={overallUtilization >= 0.3 ? "text-rose-700" : ""}>
                  {(overallUtilization * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${
                    overallUtilization >= 0.3 ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(overallUtilization * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="divide-y divide-muted/40">
                {creditAccounts.map((account) => {
                  const limit = account.creditLimit ?? 0;
                  const balance = Math.abs(account.currentBalance);
                  const utilization = limit ? balance / limit : 0;
                  return (
                    <div key={account.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-xs text-muted-strong">
                          {formatCurrency(balance)} / {formatCurrency(limit)}
                        </p>
                      </div>
                      <span className={utilization >= 0.3 ? "text-rose-700" : ""}>
                        {(utilization * 100).toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
