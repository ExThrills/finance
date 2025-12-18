"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AccountRecord, CategoryRecord } from "@/types/finance";

type Filters = {
  startDate: string;
  endDate: string;
  accountId: string;
  categoryId: string;
};

type Props = {
  accounts: AccountRecord[];
  categories: CategoryRecord[];
  filters: Filters;
  onChange: (filters: Filters) => void;
};

export function TransactionsFilters({
  accounts,
  categories,
  filters,
  onChange,
}: Props) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <div className="grid gap-3 lg:grid-cols-[repeat(4,_minmax(0,_1fr))_auto]">
        <div className="space-y-1">
          <Label htmlFor="start-date">Start date</Label>
          <Input
            id="start-date"
            type="date"
            value={filters.startDate}
            onChange={(event) =>
              onChange({ ...filters, startDate: event.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="end-date">End date</Label>
          <Input
            id="end-date"
            type="date"
            value={filters.endDate}
            onChange={(event) =>
              onChange({ ...filters, endDate: event.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <Label>Account</Label>
          <Select
            value={filters.accountId || "all"}
            onValueChange={(value) =>
              onChange({ ...filters, accountId: value === "all" ? "" : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
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
          <Select
            value={filters.categoryId || "all"}
            onValueChange={(value) =>
              onChange({ ...filters, categoryId: value === "all" ? "" : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="uncategorized">Uncategorized</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange({
                startDate: "",
                endDate: "",
                accountId: "",
                categoryId: "",
              })
            }
          >
            Clear filters
          </Button>
        </div>
      </div>
    </div>
  );
}
