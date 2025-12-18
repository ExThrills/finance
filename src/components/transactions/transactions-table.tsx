"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  const columns = useMemo<ColumnDef<TransactionWithRelations>[]>(
    () => [
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
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return (
      <div className="rounded-2xl border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Loading transactions...
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-2xl border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        No transactions match this filter.
      </div>
    );
  }

  return (
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
          <TableCell colSpan={4} className="text-right font-semibold">
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
  );
}
