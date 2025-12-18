"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/api-client";
import { accountTypes } from "@/lib/validators";
import type { AccountRecord } from "@/types/finance";

export function AccountsClient() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("checking");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchJson<AccountRecord[]>("/api/accounts");
        setAccounts(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load accounts.";
        toast.error(message);
      }
    };
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    try {
      const account = await fetchJson<AccountRecord>("/api/accounts", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), type }),
      });
      setAccounts((prev) => [...prev, account]);
      setName("");
      toast.success("Account created.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create account.";
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetchJson(`/api/accounts/${id}`, { method: "DELETE" });
      setAccounts((prev) => prev.filter((account) => account.id !== id));
      toast.success("Account removed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete account.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Manage where your money lives.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add account</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 lg:grid-cols-[1fr_200px_auto]"
          >
            <div className="space-y-1">
              <Label htmlFor="account-name">Account name</Label>
              <Input
                id="account-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Checking, Savings, Credit Card"
              />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((accountType) => (
                    <SelectItem key={accountType} value={accountType}>
                      {accountType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit">Add account</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts yet.</p>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {account.type}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(account.id)}
                >
                  Remove
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
