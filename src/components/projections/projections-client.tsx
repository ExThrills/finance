"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  PayoffPlan,
  ProjectionPoint,
  RecurringSeriesRecord,
  RecurringSuggestion,
  CategoryRecord,
} from "@/types/finance";

const cadenceOptions = ["weekly", "monthly"] as const;
const payoffStrategies = ["avalanche", "snowball"] as const;

export function ProjectionsClient() {
  const [timeline, setTimeline] = useState<ProjectionPoint[]>([]);
  const [series, setSeries] = useState<RecurringSeriesRecord[]>([]);
  const [suggestions, setSuggestions] = useState<RecurringSuggestion[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<(typeof cadenceOptions)[number]>("monthly");
  const [nextDate, setNextDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [strategy, setStrategy] = useState<(typeof payoffStrategies)[number]>("avalanche");
  const [extraPayment, setExtraPayment] = useState("");

  const load = async () => {
    try {
      const [timelineData, seriesData, accountsData, categoriesData] =
        await Promise.all([
          fetchJson<ProjectionPoint[]>("/api/projections"),
          fetchJson<RecurringSeriesRecord[]>("/api/recurring"),
          fetchJson<AccountRecord[]>("/api/accounts"),
          fetchJson<CategoryRecord[]>("/api/categories"),
        ]);
      setTimeline(timelineData);
      setSeries(seriesData);
      setAccounts(accountsData);
      setCategories(categoriesData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load projections.";
      toast.error(message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const creditAccounts = useMemo(
    () => accounts.filter((account) => account.type === "credit"),
    [accounts]
  );

  const payoffPlan = useMemo<PayoffPlan>(() => {
    const extra = Number.parseFloat(extraPayment);
    if (!creditAccounts.length || Number.isNaN(extra) || extra <= 0) {
      return {
        strategy,
        months: 0,
        totalInterest: 0,
        schedule: [],
      };
    }

    const debts = creditAccounts
      .map((account) => ({
        id: account.id,
        name: account.name,
        balance: Math.abs(account.currentBalance),
        apr: account.apr ?? 0,
        minimum: Math.max(Math.round(Math.abs(account.currentBalance) * 0.02), 2500),
      }))
      .filter((debt) => debt.balance > 0);

    const ordered = debts.sort((a, b) =>
      strategy === "avalanche" ? b.apr - a.apr : a.balance - b.balance
    );

    const schedule: { month: number; balance: number }[] = [];
    let totalInterest = 0;
    let month = 0;
    const maxMonths = 120;

    while (ordered.some((debt) => debt.balance > 0) && month < maxMonths) {
      month += 1;
      let extraPool = extra * 100;
      ordered.forEach((debt) => {
        if (debt.balance <= 0) {
          return;
        }
        const monthlyRate = debt.apr / 100 / 12;
        const interest = Math.round(debt.balance * monthlyRate);
        totalInterest += interest;
        debt.balance += interest;
      });

      ordered.forEach((debt) => {
        if (debt.balance <= 0) {
          return;
        }
        const payment = Math.min(debt.minimum, debt.balance);
        debt.balance -= payment;
        extraPool -= payment;
      });

      ordered.forEach((debt) => {
        if (debt.balance <= 0 || extraPool <= 0) {
          return;
        }
        const payment = Math.min(extraPool, debt.balance);
        debt.balance -= payment;
        extraPool -= payment;
      });

      const totalBalance = ordered.reduce((sum, debt) => sum + debt.balance, 0);
      schedule.push({ month, balance: Math.max(totalBalance, 0) });
    }

    return {
      strategy,
      months: month,
      totalInterest,
      schedule,
    };
  }, [creditAccounts, extraPayment, strategy]);

  const handleCreateSeries = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!description.trim()) {
      toast.error("Description is required.");
      return;
    }
    const parsedAmount = Number.parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount === 0) {
      toast.error("Enter a non-zero amount.");
      return;
    }
    if (!nextDate || !accountId) {
      toast.error("Account and next date are required.");
      return;
    }

    try {
      const created = await fetchJson<RecurringSeriesRecord>("/api/recurring", {
        method: "POST",
        body: JSON.stringify({
          accountId,
          categoryId: categoryId || null,
          description: description.trim(),
          amount: Math.round(parsedAmount * 100),
          cadence,
          nextDate,
        }),
      });
      setSeries((prev) => [created, ...prev]);
      setDescription("");
      setAmount("");
      setNextDate("");
      setAccountId("");
      setCategoryId("");
      toast.success("Recurring series created.");
      await load();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create series.";
      toast.error(message);
    }
  };

  const handleDetect = async () => {
    try {
      const data = await fetchJson<RecurringSuggestion[]>("/api/recurring/detect", {
        method: "POST",
      });
      setSuggestions(data);
      toast.success("Recurring suggestions updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to detect recurring.";
      toast.error(message);
    }
  };

  const handleAddSuggestion = async (suggestion: RecurringSuggestion) => {
    try {
      const created = await fetchJson<RecurringSeriesRecord>("/api/recurring", {
        method: "POST",
        body: JSON.stringify({
          accountId: suggestion.accountId,
          categoryId: suggestion.categoryId,
          description: suggestion.description,
          amount: suggestion.amount,
          cadence: suggestion.cadence,
          nextDate: suggestion.nextDate,
        }),
      });
      setSeries((prev) => [created, ...prev]);
      setSuggestions((prev) =>
        prev.filter(
          (item) =>
            !(
              item.description === suggestion.description &&
              item.amount === suggestion.amount &&
              item.nextDate === suggestion.nextDate
            )
        )
      );
      toast.success("Suggestion added.");
      await load();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add suggestion.";
      toast.error(message);
    }
  };

  const handleDeleteSeries = async (id: string) => {
    try {
      await fetchJson(`/api/recurring/${id}`, { method: "DELETE" });
      setSeries((prev) => prev.filter((item) => item.id !== id));
      toast.success("Recurring series removed.");
      await load();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete series.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Cash Flow & Projections</h1>
        <p className="text-sm text-muted-foreground">
          Model recurring flows, projected cash curve, and payoff scenarios.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projected cash curve (90 days)</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" hide />
              <YAxis tickFormatter={(value) => `$${value / 100}`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#0f172a"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create recurring series</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSeries} className="grid gap-4">
              <div className="space-y-1">
                <Label htmlFor="series-desc">Description</Label>
                <Input
                  id="series-desc"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Rent, Payroll, Subscription"
                />
              </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="series-amount">Amount</Label>
                  <Input
                    id="series-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="-1200.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cadence</Label>
                  <Select value={cadence} onValueChange={(value) => setCadence(value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cadence" />
                    </SelectTrigger>
                    <SelectContent>
                      {cadenceOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Account</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
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
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={categoryId || "none"} onValueChange={(value) => setCategoryId(value === "none" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Next date</Label>
                  <Input
                    type="date"
                    value={nextDate}
                    onChange={(event) => setNextDate(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Button type="submit">Add series</Button>
                <Button type="button" variant="outline" onClick={handleDetect}>
                  Detect recurring
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recurring series</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {series.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recurring series.</p>
            ) : (
              series.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.cadence} · next {item.nextDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(item.amount)}</p>
                  </div>
                  <Button variant="ghost" onClick={() => handleDeleteSeries(item.id)}>
                    Remove
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {suggestions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recurring suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((suggestion) => (
              <div
                key={`${suggestion.description}-${suggestion.amount}-${suggestion.nextDate}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{suggestion.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.cadence} · {suggestion.count} matches · next {suggestion.nextDate}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(suggestion.amount)}</p>
                </div>
                <Button variant="outline" onClick={() => handleAddSuggestion(suggestion)}>
                  Add
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Payoff simulator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1">
              <Label>Strategy</Label>
              <Select value={strategy} onValueChange={(value) => setStrategy(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Strategy" />
                </SelectTrigger>
                <SelectContent>
                  {payoffStrategies.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Extra monthly payment</Label>
              <Input
                inputMode="decimal"
                value={extraPayment}
                onChange={(event) => setExtraPayment(event.target.value)}
                placeholder="200"
              />
            </div>
          </div>

          {payoffPlan.schedule.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Enter an extra payment to see a payoff plan.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-muted-foreground">Months to payoff</p>
                  <p className="text-lg font-semibold">{payoffPlan.months}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total interest</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(payoffPlan.totalInterest)}
                  </p>
                </div>
              </div>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={payoffPlan.schedule}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${value / 100}`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
