"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef, RowSelectionState, SortingState } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toolbar } from "@/components/ui/toolbar";
import { formatCurrency, formatDateInput } from "@/lib/format";
import type {
  AccountRecord,
  CategoryRecord,
  TransactionWithRelations,
} from "@/types/finance";

type Props = {
  data: TransactionWithRelations[];
  accounts: AccountRecord[];
  categories: CategoryRecord[];
  loading?: boolean;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
};

function EditableTextCell({
  value,
  onCommit,
  align = "left",
}: {
  value: string;
  onCommit: (next: string) => void;
  align?: "left" | "right";
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <Input
      className={`h-8 border-none bg-transparent px-2 shadow-none focus-visible:ring-1 ${
        align === "right" ? "text-right" : "text-left"
      }`}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft.trim() && draft !== value) {
          onCommit(draft.trim());
        } else if (!draft.trim()) {
          setDraft(value);
        }
      }}
    />
  );
}

function EditableDateCell({
  value,
  onCommit,
}: {
  value: Date | string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(formatDateInput(value));
  useEffect(() => {
    setDraft(formatDateInput(value));
  }, [value]);

  return (
    <Input
      className="h-8 border-none bg-transparent px-2 shadow-none focus-visible:ring-1"
      type="date"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft && draft !== formatDateInput(value)) {
          onCommit(draft);
        }
      }}
    />
  );
}

function EditableAmountCell({
  value,
  onCommit,
  isIncome,
}: {
  value: number;
  onCommit: (next: number) => void;
  isIncome: boolean;
}) {
  const [draft, setDraft] = useState((value / 100).toFixed(2));
  useEffect(() => {
    setDraft((value / 100).toFixed(2));
  }, [value]);

  return (
    <Input
      className={`h-8 border-none bg-transparent px-2 text-right font-mono text-sm shadow-none focus-visible:ring-1 ${
        isIncome ? "text-emerald-700" : "text-rose-700"
      }`}
      inputMode="decimal"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const parsed = Number.parseFloat(draft);
        if (!Number.isNaN(parsed)) {
          const cents = Math.round(parsed * 100);
          if (cents !== value) {
            onCommit(cents);
          }
        } else {
          setDraft((value / 100).toFixed(2));
        }
      }}
    />
  );
}

function EditableSelectCell({
  value,
  options,
  placeholder,
  onCommit,
  allowNull = false,
  nullLabel = "Uncategorized",
}: {
  value: string | null;
  options: { value: string; label: string }[];
  placeholder: string;
  onCommit: (next: string | null) => void;
  allowNull?: boolean;
  nullLabel?: string;
}) {
  return (
    <Select
      value={value ?? (allowNull ? "uncategorized" : "")}
      onValueChange={(next) =>
        onCommit(next === "uncategorized" ? null : next)
      }
    >
      <SelectTrigger className="h-8 border-none bg-transparent px-2 shadow-none focus:ring-1">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNull && (
          <SelectItem value="uncategorized">{nullLabel}</SelectItem>
        )}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TransactionsTable({
  data,
  accounts,
  categories,
  loading,
  onUpdate,
  onDelete,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkAccountId, setBulkAccountId] = useState("");
  const [bulkPending, setBulkPending] = useState("");

  const columns = useMemo<ColumnDef<TransactionWithRelations>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select all rows"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(event) =>
              table.toggleAllPageRowsSelected(event.target.checked)
            }
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select transaction ${row.original.description}`}
            checked={row.getIsSelected()}
            onChange={(event) => row.toggleSelected(event.target.checked)}
          />
        ),
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => (
          <EditableDateCell
            value={row.original.date}
            onCommit={(next) => onUpdate(row.original.id, { date: next })}
          />
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <EditableTextCell
            value={row.original.description}
            onCommit={(next) => onUpdate(row.original.id, { description: next })}
          />
        ),
      },
      {
        accessorKey: "accountId",
        header: "Account",
        cell: ({ row }) => (
          <EditableSelectCell
            value={row.original.accountId}
            placeholder="Account"
            options={accounts.map((account) => ({
              value: account.id,
              label: account.name,
            }))}
            onCommit={(next) => {
              if (next) {
                onUpdate(row.original.id, { accountId: next });
              }
            }}
          />
        ),
      },
      {
        accessorKey: "categoryId",
        header: "Category",
        cell: ({ row }) => (
          <div className="space-y-1">
            <EditableSelectCell
              value={row.original.categoryId ?? null}
              placeholder="Uncategorized"
              allowNull
              nullLabel="Uncategorized"
              options={categories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
              onCommit={(next) => onUpdate(row.original.id, { categoryId: next })}
            />
            {row.original.ruleApplied ? (
              <Badge variant="secondary">Rule: {row.original.ruleApplied}</Badge>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: () => <span className="flex justify-end">Amount</span>,
        cell: ({ row }) => (
          <EditableAmountCell
            value={row.original.amount}
            isIncome={row.original.category?.kind === "income"}
            onCommit={(next) => onUpdate(row.original.id, { amount: next })}
          />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDelete(row.original.id)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [accounts, categories, onDelete, onUpdate]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedIds = selectedRows.map((row) => row.original.id);

  const applyBulkUpdate = (patch: Record<string, unknown>) => {
    selectedRows.forEach((row) => {
      onUpdate(row.original.id, patch);
    });
    table.resetRowSelection();
  };

  const handleBulkDelete = () => {
    selectedRows.forEach((row) => onDelete(row.original.id));
    table.resetRowSelection();
  };

  if (loading) {
    return (
      <EmptyState
        title="Loading transactions"
        description="Fetching the latest ledger entries."
        align="center"
      />
    );
  }

  if (!data.length) {
    return (
      <EmptyState
        title="No results"
        description="No transactions match this filter."
        align="center"
      />
    );
  }

  return (
    <div className="space-y-3">
      <Toolbar>
        <div className="font-medium">
          {selectedIds.length} selected
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue placeholder="Set category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selectedIds.length || !bulkCategoryId}
            onClick={() =>
              applyBulkUpdate({ categoryId: bulkCategoryId || null })
            }
          >
            Apply
          </Button>
          <Select value={bulkAccountId} onValueChange={setBulkAccountId}>
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue placeholder="Set account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selectedIds.length || !bulkAccountId}
            onClick={() =>
              applyBulkUpdate({ accountId: bulkAccountId })
            }
          >
            Apply
          </Button>
          <Select value={bulkPending} onValueChange={setBulkPending}>
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue placeholder="Pending state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Mark pending</SelectItem>
              <SelectItem value="cleared">Mark cleared</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selectedIds.length || !bulkPending}
            onClick={() =>
              applyBulkUpdate({ isPending: bulkPending === "pending" })
            }
          >
            Apply
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!selectedIds.length}
            onClick={handleBulkDelete}
          >
            Delete selected
          </Button>
        </div>
      </Toolbar>
      <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                className="cursor-pointer select-none"
                onClick={header.column.getToggleSortingHandler()}
              >
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
                {header.column.getIsSorted() === "asc" && " ^"}
                {header.column.getIsSorted() === "desc" && " v"}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
      <tfoot>
        <TableRow>
          <TableCell colSpan={5} className="text-right font-semibold">
            Total
          </TableCell>
          <TableCell className="text-right font-semibold">
            {formatCurrency(
              data.reduce((sum, tx) => {
                const isIncome = tx.category?.kind === "income";
                return sum + (isIncome ? tx.amount : -tx.amount);
              }, 0)
            )}
          </TableCell>
          <TableCell />
        </TableRow>
      </tfoot>
      </Table>
    </div>
  );
}
