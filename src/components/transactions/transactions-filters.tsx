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
import type { AccountRecord, CategoryRecord, TagRecord } from "@/types/finance";

type Filters = {
  startDate: string;
  endDate: string;
  accountId: string;
  accountType: string;
  institution: string;
  categoryId: string;
  tagId: string;
  status: "all" | "pending" | "cleared";
};

type Props = {
  accounts: AccountRecord[];
  categories: CategoryRecord[];
  tags: TagRecord[];
  accountTypes: string[];
  institutions: string[];
  filters: Filters;
  onChange: (filters: Filters) => void;
};

export function TransactionsFilters({
  accounts,
  categories,
  tags,
  accountTypes,
  institutions,
  filters,
  onChange,
}: Props) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
          <Label>Account type</Label>
          <Select
            value={filters.accountType || "all"}
            onValueChange={(value) =>
              onChange({ ...filters, accountType: value === "all" ? "" : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {accountTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
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
        <div className="space-y-1">
          <Label>Institution</Label>
          <Select
            value={filters.institution || "all"}
            onValueChange={(value) =>
              onChange({
                ...filters,
                institution: value === "all" ? "" : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All institutions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All institutions</SelectItem>
              {institutions.map((institution) => (
                <SelectItem key={institution} value={institution}>
                  {institution === "unknown" ? "Unassigned" : institution}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Tag</Label>
          <Select
            value={filters.tagId || "all"}
            onValueChange={(value) =>
              onChange({ ...filters, tagId: value === "all" ? "" : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              onChange({
                ...filters,
                status: value as Filters["status"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cleared">Cleared</SelectItem>
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
                accountType: "",
                institution: "",
                categoryId: "",
                tagId: "",
                status: "all",
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
