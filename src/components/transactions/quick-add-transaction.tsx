"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseAmountToCents } from "@/lib/format";
import type { AccountRecord, CategoryRecord } from "@/types/finance";

type QuickAddProps = {
  accounts: AccountRecord[];
  categories: CategoryRecord[];
  defaultDate: string;
  onSubmit: (payload: {
    amount: number;
    date: string;
    description: string;
    accountId: string;
    categoryId?: string | null;
    notes?: string | null;
  }) => void;
};

export function QuickAddTransaction({
  accounts,
  categories,
  defaultDate,
  onSubmit,
}: QuickAddProps) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accountId, accounts]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cents = parseAmountToCents(amount);
    if (!cents || cents <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (!accountId) {
      toast.error("Select an account.");
      return;
    }
    const trimmedDescription = description.trim() || "Quick add";
    onSubmit({
      amount: cents,
      date,
      description: trimmedDescription,
      accountId,
      categoryId: categoryId || null,
      notes: notes.trim() || null,
    });
    setAmount("");
    setDescription("");
    setNotes("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border bg-muted/30 p-4 lg:max-w-[720px]"
    >
      <div className="grid gap-3 lg:grid-cols-[140px_1fr_160px_160px]">
        <div className="space-y-1">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            placeholder="0.00"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            placeholder="Coffee, rent, paycheck"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="space-y-1">
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
        <div className="space-y-1">
          <Label>Category</Label>
          <Select
            value={categoryId ?? "uncategorized"}
            onValueChange={(value) =>
              setCategoryId(value === "uncategorized" ? null : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Uncategorized" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uncategorized">Uncategorized</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[160px_1fr_auto]">
        <div className="space-y-1">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            placeholder="Optional memo"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full lg:w-auto">
            Add transaction
          </Button>
        </div>
      </div>
    </form>
  );
}
