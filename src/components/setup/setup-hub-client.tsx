"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toolbar } from "@/components/ui/toolbar";
import { accountTypes } from "@/lib/validators";
import { parseAmountToCents, formatCurrency } from "@/lib/format";
import { fetchJson } from "@/lib/api-client";

type AccountDraft = {
  id: string;
  name: string;
  type: string;
  startingBalance: string;
  creditLimit: string;
  institution: string;
  last4: string;
  statementCloseDay: string;
  statementDueDay: string;
  rewardCurrency: string;
  apr: string;
  showAdvanced: boolean;
};

type DraftErrors = {
  name?: string;
  startingBalance?: string;
  creditLimit?: string;
  last4?: string;
  statementCloseDay?: string;
  statementDueDay?: string;
  apr?: string;
};

type DebtDraft = {
  id: string;
  name: string;
  currentBalance: string;
  apr: string;
  dueDay: string;
};

type DebtErrors = {
  name?: string;
  currentBalance?: string;
  apr?: string;
  dueDay?: string;
};

const newDraft = (): AccountDraft => ({
  id: `draft-${Math.random().toString(36).slice(2)}`,
  name: "",
  type: "checking",
  startingBalance: "",
  creditLimit: "",
  institution: "",
  last4: "",
  statementCloseDay: "",
  statementDueDay: "",
  rewardCurrency: "",
  apr: "",
  showAdvanced: false,
});

const newDebtDraft = (): DebtDraft => ({
  id: `debt-${Math.random().toString(36).slice(2)}`,
  name: "",
  currentBalance: "",
  apr: "",
  dueDay: "",
});

const isRequiredStartingBalance = (type: string) =>
  ["checking", "savings", "cash", "investment", "loan", "other"].includes(type);

const getDraftErrors = (draft: AccountDraft): DraftErrors => {
  const errors: DraftErrors = {};
  if (!draft.name.trim()) {
    errors.name = "Account name is required.";
  }

  const starting = parseAmountToCents(draft.startingBalance);
  const limit = parseAmountToCents(draft.creditLimit);

  if (draft.type === "credit") {
    if (limit === null || limit <= 0) {
      errors.creditLimit = "Credit cards need a limit.";
    }
  } else if (isRequiredStartingBalance(draft.type) && starting === null) {
    errors.startingBalance = "Starting balance is required.";
  }

  if (draft.last4.trim() && !/^\d{4}$/.test(draft.last4.trim())) {
    errors.last4 = "Enter exactly 4 digits.";
  }

  if (draft.statementCloseDay.trim()) {
    const day = Number.parseInt(draft.statementCloseDay, 10);
    if (Number.isNaN(day) || day < 1 || day > 31) {
      errors.statementCloseDay = "Use a day between 1 and 31.";
    }
  }

  if (draft.statementDueDay.trim()) {
    const day = Number.parseInt(draft.statementDueDay, 10);
    if (Number.isNaN(day) || day < 1 || day > 31) {
      errors.statementDueDay = "Use a day between 1 and 31.";
    }
  }

  if (draft.apr.trim()) {
    const apr = Number.parseFloat(draft.apr);
    if (Number.isNaN(apr) || apr < 0) {
      errors.apr = "APR must be zero or higher.";
    }
  }

  return errors;
};

const getDebtErrors = (debt: DebtDraft): DebtErrors => {
  const errors: DebtErrors = {};
  if (!debt.name.trim()) {
    errors.name = "Lender name is required.";
  }

  const balance = parseAmountToCents(debt.currentBalance);
  if (balance === null) {
    errors.currentBalance = "Current balance is required.";
  }

  if (debt.apr.trim()) {
    const apr = Number.parseFloat(debt.apr);
    if (Number.isNaN(apr) || apr < 0) {
      errors.apr = "APR must be zero or higher.";
    }
  }

  if (debt.dueDay.trim()) {
    const day = Number.parseInt(debt.dueDay, 10);
    if (Number.isNaN(day) || day < 1 || day > 31) {
      errors.dueDay = "Use a day between 1 and 31.";
    }
  }

  return errors;
};

const hasDraftInput = (draft: AccountDraft) =>
  [
    draft.name,
    draft.startingBalance,
    draft.creditLimit,
    draft.institution,
    draft.last4,
    draft.statementCloseDay,
    draft.statementDueDay,
    draft.rewardCurrency,
    draft.apr,
  ].some((value) => value.trim() !== "");

const hasDebtInput = (debt: DebtDraft) =>
  [debt.name, debt.currentBalance, debt.apr, debt.dueDay].some(
    (value) => value.trim() !== ""
  );

export function SetupHubClient() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<AccountDraft[]>([newDraft()]);
  const [debtDrafts, setDebtDrafts] = useState<DebtDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const updateDraft = (id: string, patch: Partial<AccountDraft>) => {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    );
  };

  const addDraft = () => {
    setDrafts((prev) => [...prev, newDraft()]);
  };

  const removeDraft = (id: string) => {
    setDrafts((prev) => prev.filter((draft) => draft.id !== id));
  };

  const updateDebtDraft = (id: string, patch: Partial<DebtDraft>) => {
    setDebtDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    );
  };

  const addDebtDraft = () => {
    setDebtDrafts((prev) => [...prev, newDebtDraft()]);
  };

  const removeDebtDraft = (id: string) => {
    setDebtDrafts((prev) => prev.filter((draft) => draft.id !== id));
  };

  const linkedLoanDrafts = useMemo(
    () => drafts.filter((draft) => draft.type === "loan"),
    [drafts]
  );

  const summary = useMemo(() => {
    let cashTotal = 0;
    let creditLimit = 0;
    let creditBalance = 0;

    drafts.forEach((draft) => {
      const starting = parseAmountToCents(draft.startingBalance) ?? 0;
      const limit = parseAmountToCents(draft.creditLimit) ?? 0;
      if (["checking", "savings", "cash", "investment", "other"].includes(draft.type)) {
        cashTotal += starting;
      }
      if (draft.type === "credit") {
        creditLimit += limit;
        creditBalance += Math.abs(starting);
      }
    });

    const utilization = creditLimit > 0 ? creditBalance / creditLimit : 0;
    return { cashTotal, creditLimit, creditBalance, utilization };
  }, [drafts]);

  const draftErrors = useMemo(() => {
    return drafts.reduce<Record<string, DraftErrors>>((acc, draft) => {
      acc[draft.id] = getDraftErrors(draft);
      return acc;
    }, {});
  }, [drafts]);

  const debtErrors = useMemo(() => {
    return debtDrafts.reduce<Record<string, DebtErrors>>((acc, debt) => {
      acc[debt.id] = getDebtErrors(debt);
      return acc;
    }, {});
  }, [debtDrafts]);

  const hasAccountErrors = useMemo(
    () => Object.values(draftErrors).some((errors) => Object.keys(errors).length > 0),
    [draftErrors]
  );

  const hasDebtErrors = useMemo(
    () => Object.values(debtErrors).some((errors) => Object.keys(errors).length > 0),
    [debtErrors]
  );

  const hasErrors = hasAccountErrors || hasDebtErrors;

  const handleSubmit = async () => {
    if (hasErrors) {
      toast.error("Fix the highlighted fields before finishing setup.");
      return;
    }

    const payloads = drafts.map((draft) => {
      if (!draft.name.trim()) {
        throw new Error("Every account needs a name.");
      }
      const starting = parseAmountToCents(draft.startingBalance);
      const limit = parseAmountToCents(draft.creditLimit);

      if (draft.type === "credit" && (limit === null || limit <= 0)) {
        throw new Error("Credit cards need a credit limit.");
      }
      if (
        draft.type !== "credit" &&
        (starting === null || Number.isNaN(starting))
      ) {
        throw new Error("Checking and savings accounts need a starting balance.");
      }

      const parsedApr = draft.apr ? Number.parseFloat(draft.apr) : null;
      const parsedClose = draft.statementCloseDay
        ? Number.parseInt(draft.statementCloseDay, 10)
        : null;
      const parsedDue = draft.statementDueDay
        ? Number.parseInt(draft.statementDueDay, 10)
        : null;

      return {
        name: draft.name.trim(),
        type: draft.type,
        institution: draft.institution.trim() || undefined,
        last4: draft.last4.trim() || undefined,
        creditLimit: limit ?? undefined,
        startingBalance: starting ?? undefined,
        apr: parsedApr ?? undefined,
        statementCloseDay: parsedClose ?? undefined,
        statementDueDay: parsedDue ?? undefined,
        rewardCurrency: draft.rewardCurrency.trim() || undefined,
      };
    });

    const debtPayloads = debtDrafts.map((debt) => {
      if (!debt.name.trim()) {
        throw new Error("Every debt needs a lender name.");
      }
      const balance = parseAmountToCents(debt.currentBalance);
      if (balance === null || Number.isNaN(balance)) {
        throw new Error("Every debt needs a current balance.");
      }
      const parsedApr = debt.apr ? Number.parseFloat(debt.apr) : null;
      const parsedDue = debt.dueDay ? Number.parseInt(debt.dueDay, 10) : null;

      return {
        name: debt.name.trim(),
        type: "loan",
        startingBalance: balance,
        apr: parsedApr ?? undefined,
        statementDueDay: parsedDue ?? undefined,
      };
    });

    setSaving(true);
    try {
      await Promise.all(
        [...payloads, ...debtPayloads].map((payload) =>
          fetchJson("/api/accounts", {
            method: "POST",
            body: JSON.stringify(payload),
          })
        )
      );
      toast.success("Accounts created.");
      router.push("/transactions");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save accounts.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Setup hub"
        description="Add accounts and starting balances in one place."
        actions={
          <Button onClick={addDraft} variant="outline">
            Add another account
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Accounts & balances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {drafts.map((draft, index) => {
            const errors = draftErrors[draft.id] ?? {};
            const showErrors = hasDraftInput(draft);

            return (
              <div key={draft.id} className="rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold">Account {index + 1}</p>
                {drafts.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDraft(draft.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1">
                  <Label>Account name</Label>
                  <Input
                    value={draft.name}
                    onChange={(event) => updateDraft(draft.id, { name: event.target.value })}
                    placeholder="Checking, Savings, Amex"
                    className={`min-w-0 ${errors.name && showErrors ? "border-rose-500" : ""}`}
                  />
                  {errors.name && showErrors ? (
                    <p className="text-xs text-rose-600">{errors.name}</p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select
                    value={draft.type}
                    onValueChange={(value) => updateDraft(draft.id, { type: value })}
                  >
                    <SelectTrigger className="min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accountTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {draft.type === "credit" ? (
                  <div className="space-y-1">
                    <Label>Credit limit</Label>
                    <Input
                      inputMode="decimal"
                      value={draft.creditLimit}
                      onChange={(event) =>
                        updateDraft(draft.id, { creditLimit: event.target.value })
                      }
                      placeholder="5000.00"
                      className={`min-w-0 ${
                        errors.creditLimit && showErrors ? "border-rose-500" : ""
                      }`}
                    />
                    {errors.creditLimit && showErrors ? (
                      <p className="text-xs text-rose-600">{errors.creditLimit}</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label>Starting balance</Label>
                    <Input
                      inputMode="decimal"
                      value={draft.startingBalance}
                      onChange={(event) =>
                        updateDraft(draft.id, { startingBalance: event.target.value })
                      }
                      placeholder="1200.00"
                      className={`min-w-0 ${
                        errors.startingBalance && showErrors ? "border-rose-500" : ""
                      }`}
                    />
                    {errors.startingBalance && showErrors ? (
                      <p className="text-xs text-rose-600">{errors.startingBalance}</p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateDraft(draft.id, { showAdvanced: !draft.showAdvanced })
                  }
                >
                  {draft.showAdvanced ? "Hide advanced" : "Show advanced"}
                </Button>
              </div>

              {draft.showAdvanced ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <p className="md:col-span-2 xl:col-span-3 text-xs text-muted-foreground">
                    Optional details help with utilization, statements, and rewards tracking.
                  </p>
                  <div className="space-y-1">
                    <Label>Institution</Label>
                    <Input
                      value={draft.institution}
                      onChange={(event) =>
                        updateDraft(draft.id, { institution: event.target.value })
                      }
                      placeholder="Chase, Ally"
                      className="min-w-0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Last 4</Label>
                    <Input
                      value={draft.last4}
                      onChange={(event) =>
                        updateDraft(draft.id, { last4: event.target.value })
                      }
                      placeholder="1234"
                      maxLength={4}
                      className={`min-w-0 ${errors.last4 && showErrors ? "border-rose-500" : ""}`}
                    />
                    {errors.last4 && showErrors ? (
                      <p className="text-xs text-rose-600">{errors.last4}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label>APR (%)</Label>
                    <Input
                      inputMode="decimal"
                      value={draft.apr}
                      onChange={(event) =>
                        updateDraft(draft.id, { apr: event.target.value })
                      }
                      placeholder="19.99"
                      className={`min-w-0 ${errors.apr && showErrors ? "border-rose-500" : ""}`}
                    />
                    {errors.apr && showErrors ? (
                      <p className="text-xs text-rose-600">{errors.apr}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label>Statement close day</Label>
                    <Input
                      inputMode="numeric"
                      value={draft.statementCloseDay}
                      onChange={(event) =>
                        updateDraft(draft.id, { statementCloseDay: event.target.value })
                      }
                      placeholder="25"
                      className={
                        `min-w-0 ${errors.statementCloseDay && showErrors ? "border-rose-500" : ""}`
                      }
                    />
                    {errors.statementCloseDay && showErrors ? (
                      <p className="text-xs text-rose-600">{errors.statementCloseDay}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label>Statement due day</Label>
                    <Input
                      inputMode="numeric"
                      value={draft.statementDueDay}
                      onChange={(event) =>
                        updateDraft(draft.id, { statementDueDay: event.target.value })
                      }
                      placeholder="15"
                      className={
                        `min-w-0 ${errors.statementDueDay && showErrors ? "border-rose-500" : ""}`
                      }
                    />
                    {errors.statementDueDay && showErrors ? (
                      <p className="text-xs text-rose-600">{errors.statementDueDay}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label>Rewards currency</Label>
                    <Input
                      value={draft.rewardCurrency}
                      onChange={(event) =>
                        updateDraft(draft.id, { rewardCurrency: event.target.value })
                      }
                      placeholder="Points, Miles"
                      className="min-w-0"
                    />
                  </div>
                </div>
              ) : null}
            </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debts & obligations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add loans and obligations that are not credit cards. This helps keep payoff and
            projection views accurate.
          </p>

          {linkedLoanDrafts.length ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-3 text-sm">
              <p className="font-semibold text-foreground">Loan accounts already added</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {linkedLoanDrafts.map((loan) => {
                  const balance =
                    parseAmountToCents(loan.startingBalance) ?? null;
                  return (
                    <div key={loan.id} className="rounded-md border bg-background p-2">
                      <p className="text-sm font-medium">{loan.name || "Loan account"}</p>
                      <p className="text-xs text-muted-foreground">
                        Balance{" "}
                        {balance !== null ? formatCurrency(balance) : "not provided"}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                You can update loan balances in the Accounts section above.
              </p>
            </div>
          ) : null}

          {debtDrafts.map((debt, index) => {
            const errors = debtErrors[debt.id] ?? {};
            const showErrors = hasDebtInput(debt);

            return (
              <div key={debt.id} className="rounded-lg border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Debt {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDebtDraft(debt.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Lender name</Label>
                    <Input
                      value={debt.name}
                      onChange={(event) =>
                        updateDebtDraft(debt.id, { name: event.target.value })
                      }
                      placeholder="Student loan, Auto loan"
                      className={`min-w-0 ${errors.name && showErrors ? "border-rose-500" : ""}`}
                    />
                    {errors.name && showErrors ? (
                      <p className="text-xs text-rose-600">{errors.name}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label>Current balance</Label>
                    <Input
                      inputMode="decimal"
                      value={debt.currentBalance}
                      onChange={(event) =>
                        updateDebtDraft(debt.id, { currentBalance: event.target.value })
                      }
                      placeholder="12000.00"
                      className={`min-w-0 ${
                        errors.currentBalance && showErrors ? "border-rose-500" : ""
                      }`}
                    />
                    {errors.currentBalance && showErrors ? (
                      <p className="text-xs text-rose-600">{errors.currentBalance}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label>APR (%)</Label>
                    <Input
                      inputMode="decimal"
                      value={debt.apr}
                      onChange={(event) => updateDebtDraft(debt.id, { apr: event.target.value })}
                      placeholder="5.99"
                      className={`min-w-0 ${errors.apr && showErrors ? "border-rose-500" : ""}`}
                    />
                    {errors.apr && showErrors ? (
                      <p className="text-xs text-rose-600">{errors.apr}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label>Due day</Label>
                    <Input
                      inputMode="numeric"
                      value={debt.dueDay}
                      onChange={(event) =>
                        updateDebtDraft(debt.id, { dueDay: event.target.value })
                      }
                      placeholder="1"
                      className={`min-w-0 ${
                        errors.dueDay && showErrors ? "border-rose-500" : ""
                      }`}
                    />
                    {errors.dueDay && showErrors ? (
                      <p className="text-xs text-rose-600">{errors.dueDay}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          <Button type="button" variant="outline" onClick={addDebtDraft}>
            Add another debt
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick review</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-strong">
              Cash on hand
            </p>
            <p className="text-2xl font-semibold">{formatCurrency(summary.cashTotal)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-strong">
              Credit limits
            </p>
            <p className="text-2xl font-semibold">{formatCurrency(summary.creditLimit)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-strong">
              Utilization
            </p>
            <p className="text-2xl font-semibold">
              {summary.creditLimit > 0 ? `${(summary.utilization * 100).toFixed(1)}%` : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Toolbar className="px-4 py-3">
        <div className="text-sm text-muted-foreground">
          You can edit or add more details later in Accounts.
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/accounts")}>
            Review accounts
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || hasErrors}>
            {saving ? "Saving..." : "Finish setup"}
          </Button>
        </div>
      </Toolbar>
    </div>
  );
}
