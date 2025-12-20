"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { fetchJson } from "@/lib/api-client";
import { formatCurrency, formatDateInput } from "@/lib/format";
import type {
  AccountRecord,
  CategoryRecord,
  SavedViewRecord,
  TagRecord,
  TransactionWithRelations,
} from "@/types/finance";
import { useAccountScope } from "@/components/account-scope-context";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Toolbar } from "@/components/ui/toolbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuickAddTransaction } from "@/components/transactions/quick-add-transaction";
import { TransactionsFilters } from "@/components/transactions/transactions-filters";
import { TransactionsTable } from "@/components/transactions/transactions-table";

type Filters = {
  startDate: string;
  endDate: string;
  accountId: string;
  accountType: string;
  institution: string;
  categoryId: string;
  tagId: string;
  status: "all" | "pending" | "cleared";
  recurringOnly: boolean;
  largeOnly: boolean;
};

const defaultFilters: Filters = {
  startDate: "",
  endDate: "",
  accountId: "",
  accountType: "",
  institution: "",
  categoryId: "",
  tagId: "",
  status: "all",
  recurringOnly: false,
  largeOnly: false,
};

const normalizeFilters = (raw?: Record<string, unknown>): Filters => ({
  startDate: typeof raw?.startDate === "string" ? raw.startDate : "",
  endDate: typeof raw?.endDate === "string" ? raw.endDate : "",
  accountId: typeof raw?.accountId === "string" ? raw.accountId : "",
  accountType: typeof raw?.accountType === "string" ? raw.accountType : "",
  institution: typeof raw?.institution === "string" ? raw.institution : "",
  categoryId: typeof raw?.categoryId === "string" ? raw.categoryId : "",
  tagId: typeof raw?.tagId === "string" ? raw.tagId : "",
  status:
    raw?.status === "pending" || raw?.status === "cleared" ? raw.status : "all",
  recurringOnly: raw?.recurringOnly === true,
  largeOnly: raw?.largeOnly === true,
});

export function TransactionsClient() {
  const largeThreshold = 100_000;
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [savedViews, setSavedViews] = useState<SavedViewRecord[]>([]);
  const [activeViewId, setActiveViewId] = useState("");
  const [viewName, setViewName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const { scope } = useAccountScope();

  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );

  const accountTypes = useMemo(() => {
    const set = new Set<string>();
    accounts.forEach((account) => set.add(account.type));
    return Array.from(set).sort();
  }, [accounts]);

  const institutions = useMemo(() => {
    const set = new Set<string>();
    accounts.forEach((account) => {
      if (account.institution && account.institution.trim()) {
        set.add(account.institution);
      } else {
        set.add("unknown");
      }
    });
    return Array.from(set).sort();
  }, [accounts]);

  const filteredTransactions = useMemo(() => {
    const start = filters.startDate ? new Date(filters.startDate) : null;
    const end = filters.endDate ? new Date(filters.endDate) : null;
    if (start) {
      start.setHours(0, 0, 0, 0);
    }
    if (end) {
      end.setHours(23, 59, 59, 999);
    }

    return transactions.filter((tx) => {
      if (scope.kind === "account" && tx.accountId !== scope.value) {
        return false;
      }
      if (scope.kind === "type") {
        const account = accountById.get(tx.accountId);
        if (!account || account.type !== scope.value) {
          return false;
        }
      }
      if (scope.kind === "institution") {
        const account = accountById.get(tx.accountId);
        if (!account || account.institution !== scope.value) {
          return false;
        }
      }
      if (filters.accountId && tx.accountId !== filters.accountId) {
        return false;
      }
      if (filters.accountType) {
        const account = accountById.get(tx.accountId);
        if (!account || account.type !== filters.accountType) {
          return false;
        }
      }
      if (filters.institution) {
        const account = accountById.get(tx.accountId);
        const institution =
          account?.institution && account.institution.trim()
            ? account.institution
            : "unknown";
        if (institution !== filters.institution) {
          return false;
        }
      }
      if (filters.categoryId) {
        if (filters.categoryId === "uncategorized") {
          if (tx.categoryId) {
            return false;
          }
        } else if (tx.categoryId !== filters.categoryId) {
          return false;
        }
      }
      if (filters.tagId) {
        if (!tx.tags?.some((tag) => tag.id === filters.tagId)) {
          return false;
        }
      }
      if (filters.status === "pending" && !tx.isPending) {
        return false;
      }
      if (filters.status === "cleared" && tx.isPending) {
        return false;
      }
      if (filters.recurringOnly && !tx.recurringGroupKey) {
        return false;
      }
      if (filters.largeOnly && Math.abs(tx.amount) < largeThreshold) {
        return false;
      }
      if (start && new Date(tx.date) < start) {
        return false;
      }
      if (end && new Date(tx.date) > end) {
        return false;
      }
      return true;
    });
  }, [transactions, filters, accountById, scope, largeThreshold]);

  const inboxCount = useMemo(
    () => transactions.filter((tx) => !tx.categoryId).length,
    [transactions]
  );

  const summary = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, tx) => {
        const isIncome = tx.category?.kind === "income";
        if (isIncome) {
          acc.income += tx.amount;
        } else {
          acc.expense += tx.amount;
        }
        acc.net += isIncome ? tx.amount : -tx.amount;
        acc.count += 1;
        return acc;
      },
      { income: 0, expense: 0, net: 0, count: 0 }
    );
  }, [filteredTransactions]);

  const activeView = savedViews.find((view) => view.id === activeViewId) ?? null;

  useEffect(() => {
    const load = async () => {
      try {
        const [
          accountsData,
          categoriesData,
          transactionsData,
          tagsData,
          savedViewsData,
        ] = await Promise.all([
          fetchJson<AccountRecord[]>("/api/accounts"),
          fetchJson<CategoryRecord[]>("/api/categories"),
          fetchJson<TransactionWithRelations[]>("/api/transactions"),
          fetchJson<TagRecord[]>("/api/tags"),
          fetchJson<SavedViewRecord[]>("/api/saved-views"),
        ]);
        setAccounts(accountsData);
        setCategories(categoriesData);
        setTransactions(transactionsData);
        setTags(tagsData);
        setSavedViews(savedViewsData);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load data.";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCreated = (transaction: TransactionWithRelations) => {
    setTransactions((prev) => [transaction, ...prev]);
    setFilters((prev) => ({ ...prev, startDate: "", endDate: "" }));
  };

  const handleUpdated = (transaction: TransactionWithRelations) => {
    setTransactions((prev) =>
      prev.map((item) => (item.id === transaction.id ? transaction : item))
    );
  };

  const handleDeleted = (id: string) => {
    setTransactions((prev) => prev.filter((item) => item.id !== id));
  };

  const applyQuickFilter = (next: Partial<Filters>) => {
    setActiveViewId("");
    setFilters((prev) => ({ ...prev, ...next }));
  };

  const applyInboxFilters = () => {
    setActiveViewId("");
    setFilters({
      ...defaultFilters,
      categoryId: "uncategorized",
    });
  };

  const applySavedView = (viewId: string) => {
    if (!viewId || viewId === "none") {
      setActiveViewId("");
      return;
    }
    const view = savedViews.find((item) => item.id === viewId);
    if (!view) {
      return;
    }
    setActiveViewId(viewId);
    setFilters(normalizeFilters(view.filters));
  };

  const handleSaveView = async () => {
    if (!viewName.trim()) {
      toast.error("Name your saved view.");
      return;
    }
    try {
      const created = await fetchJson<SavedViewRecord>("/api/saved-views", {
        method: "POST",
        body: JSON.stringify({ name: viewName.trim(), filters }),
      });
      setSavedViews((prev) => [created, ...prev]);
      setActiveViewId(created.id);
      setViewName("");
      setSaveOpen(false);
      toast.success("Saved view created.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save view.";
      toast.error(message);
    }
  };

  const handleUpdateView = async () => {
    if (!activeViewId) {
      toast.error("Select a saved view first.");
      return;
    }
    try {
      const updated = await fetchJson<SavedViewRecord>(
        `/api/saved-views/${activeViewId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ filters }),
        }
      );
      setSavedViews((prev) =>
        prev.map((view) => (view.id === updated.id ? updated : view))
      );
      toast.success("Saved view updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update view.";
      toast.error(message);
    }
  };

  const handleDeleteView = async () => {
    if (!activeViewId) {
      toast.error("Select a saved view first.");
      return;
    }
    try {
      await fetchJson(`/api/saved-views/${activeViewId}`, { method: "DELETE" });
      setSavedViews((prev) =>
        prev.filter((view) => view.id !== activeViewId)
      );
      setActiveViewId("");
      toast.success("Saved view deleted.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete view.";
      toast.error(message);
    }
  };

  const handleQuickAdd = async (payload: {
    amount: number;
    date: string;
    description: string;
    accountId: string;
    categoryId?: string | null;
    notes?: string | null;
    isPending?: boolean;
  }) => {
    try {
      const transaction = await fetchJson<TransactionWithRelations>(
        "/api/transactions",
        {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            date: payload.date,
          }),
        }
      );
      toast.success("Transaction added.");
      handleCreated(transaction);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add transaction.";
      toast.error(message);
    }
  };

  const handleTransfer = async (payload: {
    amount: number;
    date: string;
    description: string;
    sourceAccountId: string;
    destinationAccountId: string;
    memo?: string | null;
  }) => {
    try {
      const response = await fetchJson<{
        transactions: TransactionWithRelations[];
      }>("/api/transfers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (response.transactions) {
        setTransactions((prev) => [...response.transactions, ...prev]);
      }
      toast.success("Transfer recorded.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add transfer.";
      toast.error(message);
    }
  };

  const handleUpdate = async (id: string, patch: Record<string, unknown>) => {
    try {
      const transaction = await fetchJson<TransactionWithRelations>(
        `/api/transactions/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(patch),
        }
      );
      handleUpdated(transaction);
      toast.success("Transaction updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Update failed.";
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetchJson(`/api/transactions/${id}`, { method: "DELETE" });
      handleDeleted(id);
      toast.success("Transaction removed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Delete failed.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Edit cells inline and keep your ledger up to date."
        actions={
          <QuickAddTransaction
            accounts={accounts}
            categories={categories}
            defaultDate={formatDateInput(new Date())}
            onSubmitTransaction={handleQuickAdd}
            onSubmitTransfer={handleTransfer}
          />
        }
      />

      <Toolbar className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] space-y-1">
            <Label>Saved views</Label>
            <Select value={activeViewId || "none"} onValueChange={applySavedView}>
              <SelectTrigger>
                <SelectValue placeholder="Select a saved view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No saved view</SelectItem>
                {savedViews.map((view) => (
                  <SelectItem key={view.id} value={view.id}>
                    {view.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  Save current view
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save filters as a view</DialogTitle>
                  <DialogDescription>
                    Name this filter set so you can jump back to it later.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="view-name">View name</Label>
                  <Input
                    id="view-name"
                    value={viewName}
                    onChange={(event) => setViewName(event.target.value)}
                    placeholder="e.g. Gas on Amex"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" onClick={handleSaveView}>
                    Save view
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUpdateView}
              disabled={!activeView}
            >
              Update view
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDeleteView}
              disabled={!activeView}
            >
              Delete view
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span>Inbox</span>
            <Button
              type="button"
              variant={filters.categoryId === "uncategorized" ? "default" : "outline"}
              size="sm"
              onClick={applyInboxFilters}
            >
              Uncategorized ({inboxCount})
            </Button>
          </div>
        </div>
      </Toolbar>

      <Toolbar className="sticky top-24 z-10 bg-background/80 backdrop-blur">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            applyQuickFilter({
              status: "pending",
              startDate: "",
              endDate: "",
              recurringOnly: false,
              largeOnly: false,
            })
          }
        >
          Pending
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            applyQuickFilter({
              status: "cleared",
              startDate: "",
              endDate: "",
              recurringOnly: false,
              largeOnly: false,
            })
          }
        >
          Cleared
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            applyQuickFilter({
              categoryId: "uncategorized",
              startDate: "",
              endDate: "",
              recurringOnly: false,
              largeOnly: false,
            })
          }
        >
          Uncategorized
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            applyQuickFilter({
              recurringOnly: true,
              largeOnly: false,
            })
          }
        >
          Recurring
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            applyQuickFilter({
              largeOnly: true,
              recurringOnly: false,
            })
          }
        >
          Large
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const now = new Date();
            const start = new Date(now);
            start.setDate(start.getDate() - 6);
            applyQuickFilter({
              startDate: formatDateInput(start),
              endDate: formatDateInput(now),
            });
          }}
        >
          Last 7 days
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            applyQuickFilter({
              startDate: "",
              endDate: "",
              status: "all",
              categoryId: "",
              recurringOnly: false,
              largeOnly: false,
            })
          }
        >
          Reset quick filters
        </Button>
      </Toolbar>

      <TransactionsFilters
        accounts={accounts}
        categories={categories}
        tags={tags}
        accountTypes={accountTypes}
        institutions={institutions}
        filters={filters}
        onChange={(next) => {
          setActiveViewId("");
          setFilters(next);
        }}
      />

      <Toolbar className="px-4 py-3">
        <div className="text-sm text-muted-foreground">
          {summary.count} transactions
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            Inflow <span className="font-semibold text-emerald-700">{formatCurrency(summary.income)}</span>
          </span>
          <span className="text-muted-foreground">
            Outflow <span className="font-semibold text-rose-700">{formatCurrency(summary.expense)}</span>
          </span>
          <span className="text-muted-foreground">
            Net <span className="font-semibold">{formatCurrency(summary.net)}</span>
          </span>
        </div>
      </Toolbar>

      {loading || transactions.length > 0 ? (
        <TransactionsTable
          data={filteredTransactions}
          accounts={accounts}
          categories={categories}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          loading={loading}
        />
      ) : (
        <EmptyState
          title="No transactions yet"
          description="Add your first one or paste a bank CSV and we'll map fields."
        />
      )}
    </div>
  );
}
