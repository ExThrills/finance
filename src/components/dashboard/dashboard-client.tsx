"use client";

import { useEffect, useMemo, useState } from "react";
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
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import type { AccountRecord, TransactionWithRelations } from "@/types/finance";

const palette = ["#0f172a", "#334155", "#f59e0b", "#10b981", "#ef4444"];

function monthKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

export function DashboardClient() {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [txData, accountsData] = await Promise.all([
          fetchJson<TransactionWithRelations[]>("/api/transactions"),
          fetchJson<AccountRecord[]>("/api/accounts"),
        ]);
        setTransactions(txData);
        setAccounts(accountsData);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load dashboard.";
        toast.error(message);
      }
    };
    load();
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

  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const date = new Date(tx.date);
      return date >= monthStart && date <= monthEnd;
    });
  }, [transactions, monthEnd, monthStart]);

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
      accounts.filter(
        (account) => account.type === "credit" && account.creditLimit
      ),
    [accounts]
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
