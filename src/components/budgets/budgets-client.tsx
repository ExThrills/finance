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
      <div>
        <h1 className="text-3xl font-semibold">Budgets</h1>
        <p className="text-sm text-muted-foreground">
          Track targets by category or account with weekly or monthly periods.
        </p>
      </div>

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
          {budgets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No budgets yet. Start with one category to see progress at a glance.
            </p>
          ) : (
            budgets.map((budget) => {
              const percent = Math.min(budget.percentUsed, 200);
              return (
                <div
                  key={budget.id}
                  className="rounded-lg border bg-muted/20 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{budget.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {budget.scopeType} · {budget.period} ·{" "}
                        {budget.periodStart} → {budget.periodEnd}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(budget.actualAmount)} / {formatCurrency(budget.targetAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">{budget.percentUsed}% used</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${
                        budget.percentUsed >= 100 ? "bg-rose-500" : "bg-emerald-500"
                      }`}
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
