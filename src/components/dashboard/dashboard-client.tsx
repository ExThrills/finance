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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import type {
  AccountRecord,
  BudgetWithActuals,
  CategoryRecord,
  TransactionWithRelations,
} from "@/types/finance";
import { useAccountScope } from "@/components/account-scope-context";

const palette = ["#0f172a", "#334155", "#f59e0b", "#10b981", "#ef4444"];

function monthKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

export function DashboardClient() {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithActuals[]>([]);
  const [loadingSampleData, setLoadingSampleData] = useState(false);
  const [nextStepsDismissed, setNextStepsDismissed] = useState(false);
  const { scope } = useAccountScope();

  const loadDashboard = useCallback(async () => {
    try {
      const [txData, accountsData, categoriesData, budgetsData] =
        await Promise.all([
          fetchJson<TransactionWithRelations[]>("/api/transactions"),
          fetchJson<AccountRecord[]>("/api/accounts"),
          fetchJson<CategoryRecord[]>("/api/categories"),
          fetchJson<BudgetWithActuals[]>("/api/budgets"),
        ]);
      setTransactions(txData);
      setAccounts(accountsData);
      setCategories(categoriesData);
      setBudgets(budgetsData);
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

  const barData = useMemo(
    () => [
      { name: "Income", value: incomeTotal },
      { name: "Expenses", value: expenseTotal },
    ],
    [incomeTotal, expenseTotal]
  );

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
        label: "Add your first account",
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Snapshot of your cashflow and spending patterns.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
        </div>
      </div>

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
                      <span className="text-xs text-muted-foreground">(optional)</span>
                    ) : null}
                  </div>
                </div>
              ))}
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
              <Link href="/accounts">Add an account</Link>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
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
                      fill={palette[index % palette.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly cashflow</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyCashflow}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(value) => `$${value / 100}`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income vs expenses</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `$${value / 100}`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
                      <p className="text-xs text-muted-foreground">
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
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="font-semibold">{formatCurrency(balance)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
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
                      <p className="text-xs text-muted-foreground">Rewards</p>
                      <p className="font-semibold">
                        {account.rewardCurrency ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Statement due
                      </p>
                      <p className="font-semibold">
                        {account.statementDueDay ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
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
                  <p className="text-xs text-muted-foreground">
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
                        <p className="text-xs text-muted-foreground">
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
