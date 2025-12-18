"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { fetchJson } from "@/lib/api-client";
import { formatDateInput } from "@/lib/format";
import type {
  AccountRecord,
  CategoryRecord,
  TransactionWithRelations,
} from "@/types/finance";
import { QuickAddTransaction } from "@/components/transactions/quick-add-transaction";
import { TransactionsFilters } from "@/components/transactions/transactions-filters";
import { TransactionsTable } from "@/components/transactions/transactions-table";

type Filters = {
  startDate: string;
  endDate: string;
  accountId: string;
  categoryId: string;
};

const defaultFilters: Filters = {
  startDate: "",
  endDate: "",
  accountId: "",
  categoryId: "",
};

export function TransactionsClient() {
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [loading, setLoading] = useState(true);

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
      if (filters.accountId && tx.accountId !== filters.accountId) {
        return false;
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
      if (start && new Date(tx.date) < start) {
        return false;
      }
      if (end && new Date(tx.date) > end) {
        return false;
      }
      return true;
    });
  }, [transactions, filters]);

  useEffect(() => {
    const load = async () => {
      try {
        const [accountsData, categoriesData, transactionsData] =
          await Promise.all([
            fetchJson<AccountRecord[]>("/api/accounts"),
            fetchJson<CategoryRecord[]>("/api/categories"),
            fetchJson<TransactionWithRelations[]>("/api/transactions"),
          ]);
        setAccounts(accountsData);
        setCategories(categoriesData);
        setTransactions(transactionsData);
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

  const handleQuickAdd = async (payload: {
    amount: number;
    date: string;
    description: string;
    accountId: string;
    categoryId?: string | null;
    notes?: string | null;
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Edit cells inline and keep your ledger up to date.
          </p>
        </div>
        <QuickAddTransaction
          accounts={accounts}
          categories={categories}
          defaultDate={formatDateInput(new Date())}
          onSubmit={handleQuickAdd}
        />
      </div>

      <TransactionsFilters
        accounts={accounts}
        categories={categories}
        filters={filters}
        onChange={setFilters}
      />

      <TransactionsTable
        data={filteredTransactions}
        accounts={accounts}
        categories={categories}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        loading={loading}
      />
    </div>
  );
}
