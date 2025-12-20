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

export function SetupHubClient() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<AccountDraft[]>([newDraft()]);
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

  const handleSubmit = async () => {
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

    setSaving(true);
    try {
      await Promise.all(
        payloads.map((payload) =>
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
          {drafts.map((draft, index) => (
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
              <div className="mt-3 grid gap-4 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label>Account name</Label>
                  <Input
                    value={draft.name}
                    onChange={(event) => updateDraft(draft.id, { name: event.target.value })}
                    placeholder="Checking, Savings, Amex"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select
                    value={draft.type}
                    onValueChange={(value) => updateDraft(draft.id, { type: value })}
                  >
                    <SelectTrigger>
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
                    />
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
                    />
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
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Institution</Label>
                    <Input
                      value={draft.institution}
                      onChange={(event) =>
                        updateDraft(draft.id, { institution: event.target.value })
                      }
                      placeholder="Chase, Ally"
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
                    />
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
                    />
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
                    />
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
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Rewards currency</Label>
                    <Input
                      value={draft.rewardCurrency}
                      onChange={(event) =>
                        updateDraft(draft.id, { rewardCurrency: event.target.value })
                      }
                      placeholder="Points, Miles"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
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
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Finish setup"}
          </Button>
        </div>
      </Toolbar>
    </div>
  );
}
