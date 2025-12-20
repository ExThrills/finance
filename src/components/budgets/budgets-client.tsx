"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import type { AccountRecord, BudgetWithActuals, CategoryRecord } from "@/types/finance";

const periodOptions = ["monthly", "weekly"] as const;
const scopeOptions = ["category", "account"] as const;

export function BudgetsClient() {
  const [budgets, setBudgets] = useState<BudgetWithActuals[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [name, setName] = useState("");
  const [scopeType, setScopeType] = useState<(typeof scopeOptions)[number]>("category");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [period, setPeriod] = useState<(typeof periodOptions)[number]>("monthly");
  const [targetAmount, setTargetAmount] = useState("");

  const budgetHealth = useMemo(() => {
    return budgets.reduce(
      (acc, budget) => {
        if (budget.percentUsed >= 100) {
          acc.over += 1;
        } else if (budget.percentUsed >= 80) {
          acc.atRisk += 1;
        } else {
          acc.onTrack += 1;
        }
        return acc;
      },
      { onTrack: 0, atRisk: 0, over: 0 }
    );
  }, [budgets]);

  const [filterScope, setFilterScope] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("");

  const filteredBudgets = useMemo(() => {
    return budgets.filter((budget) => {
      if (filterScope && budget.scopeType !== filterScope) {
        return false;
      }
      if (filterPeriod && budget.period !== filterPeriod) {
        return false;
      }
      return true;
    });
  }, [budgets, filterPeriod, filterScope]);

  const relevantCategories = useMemo(
    () => categories.filter((category) => category.kind === "expense"),
    [categories]
  );

  const load = async () => {
    try {
      const [budgetsData, accountsData, categoriesData] = await Promise.all([
        fetchJson<BudgetWithActuals[]>("/api/budgets"),
        fetchJson<AccountRecord[]>("/api/accounts"),
        fetchJson<CategoryRecord[]>("/api/categories"),
      ]);
      setBudgets(budgetsData);
      setAccounts(accountsData);
      setCategories(categoriesData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load budgets.";
      toast.error(message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Budget name is required.");
      return;
    }
    const parsedAmount = Number.parseFloat(targetAmount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid target amount.");
      return;
    }
    if (scopeType === "category" && !categoryId) {
      toast.error("Select a category.");
      return;
    }
    if (scopeType === "account" && !accountId) {
      toast.error("Select an account.");
      return;
    }

    try {
      await fetchJson("/api/budgets", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          scopeType,
          categoryId: scopeType === "category" ? categoryId : null,
          accountId: scopeType === "account" ? accountId : null,
          period,
          targetAmount: Math.round(parsedAmount * 100),
        }),
      });
      setName("");
      setTargetAmount("");
      setCategoryId("");
      setAccountId("");
      toast.success("Budget created.");
      await load();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create budget.";
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetchJson(`/api/budgets/${id}`, { method: "DELETE" });
      setBudgets((prev) => prev.filter((budget) => budget.id !== id));
      toast.success("Budget removed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete budget.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description="Track targets by category or account with weekly or monthly periods."
      />

      <Card>
        <CardHeader>
          <CardTitle>Budget health</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-strong">
              On track
            </p>
            <p className="text-2xl font-semibold text-emerald-700">
              {budgetHealth.onTrack}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-strong">
              At risk
            </p>
            <p className="text-2xl font-semibold text-amber-700">
              {budgetHealth.atRisk}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-strong">
              Over
            </p>
            <p className="text-2xl font-semibold text-rose-700">
              {budgetHealth.over}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Scope</Label>
            <Select value={filterScope} onValueChange={setFilterScope}>
              <SelectTrigger>
                <SelectValue placeholder="All scopes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All scopes</SelectItem>
                {scopeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Period</Label>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="All periods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All periods</SelectItem>
                {periodOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create budget</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="budget-name">Budget name</Label>
              <Input
                id="budget-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Groceries, Dining, Amex"
              />
            </div>
            <div className="space-y-1">
              <Label>Scope</Label>
              <Select value={scopeType} onValueChange={(value) => setScopeType(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Scope type" />
                </SelectTrigger>
                <SelectContent>
                  {scopeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Period</Label>
              <Select value={period} onValueChange={(value) => setPeriod(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {scopeType === "category" ? (
              <div className="space-y-1 lg:col-span-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {relevantCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1 lg:col-span-2">
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
            )}
            <div className="space-y-1">
              <Label htmlFor="target-amount">Target amount</Label>
              <Input
                id="target-amount"
                inputMode="decimal"
                value={targetAmount}
                onChange={(event) => setTargetAmount(event.target.value)}
                placeholder="500.00"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">Add budget</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active budgets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredBudgets.length === 0 ? (
            <EmptyState
              title="No budgets yet"
              description="Start with one category to see progress at a glance."
            />
          ) : (
            filteredBudgets.map((budget) => {
              const percent = Math.min(budget.percentUsed, 200);
              const barClass =
                budget.percentUsed >= 100
                  ? "bg-rose-500"
                  : budget.percentUsed >= 80
                  ? "bg-amber-500"
                  : "bg-emerald-500";
              return (
                <div
                  key={budget.id}
                  className="rounded-lg border bg-muted/20 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{budget.name}</p>
                      <p className="text-xs text-muted-strong">
                        {budget.scopeType} · {budget.period} ·{" "}
                        {budget.periodStart} → {budget.periodEnd}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(budget.actualAmount)} / {formatCurrency(budget.targetAmount)}
                      </p>
                      <p className="text-xs text-muted-strong">{budget.percentUsed}% used</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${barClass}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button variant="ghost" onClick={() => handleDelete(budget.id)}>
                      Remove
                    </Button>
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
