"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/api-client";
import type { AccountRecord } from "@/types/finance";
import { useAccountScope } from "@/components/account-scope-context";

type Option = {
  value: string;
  label: string;
};

const toScopeValue = (value: string) => {
  if (value === "all") {
    return { kind: "all" as const };
  }
  if (value.startsWith("account:")) {
    return { kind: "account" as const, value: value.replace("account:", "") };
  }
  if (value.startsWith("type:")) {
    return { kind: "type" as const, value: value.replace("type:", "") };
  }
  if (value.startsWith("institution:")) {
    return {
      kind: "institution" as const,
      value: value.replace("institution:", ""),
    };
  }
  return { kind: "all" as const };
};

const fromScopeValue = (scope: { kind: string; value?: string }) => {
  if (scope.kind === "account" && scope.value) {
    return `account:${scope.value}`;
  }
  if (scope.kind === "type" && scope.value) {
    return `type:${scope.value}`;
  }
  if (scope.kind === "institution" && scope.value) {
    return `institution:${scope.value}`;
  }
  return "all";
};

export function AccountScopeSwitcher() {
  const { scope, setScope } = useAccountScope();
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);

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

  const accountOptions = useMemo<Option[]>(() => {
    return accounts.map((account) => ({
      value: `account:${account.id}`,
      label: account.name,
    }));
  }, [accounts]);

  const typeOptions = useMemo<Option[]>(() => {
    const set = new Set<string>();
    accounts.forEach((account) => set.add(account.type));
    return Array.from(set)
      .sort()
      .map((type) => ({
        value: `type:${type}`,
        label: type,
      }));
  }, [accounts]);

  const institutionOptions = useMemo<Option[]>(() => {
    const set = new Set<string>();
    accounts.forEach((account) => {
      if (account.institution && account.institution.trim()) {
        set.add(account.institution);
      }
    });
    return Array.from(set)
      .sort()
      .map((institution) => ({
        value: `institution:${institution}`,
        label: institution,
      }));
  }, [accounts]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Scope
      </span>
      <Select
        value={fromScopeValue(scope)}
        onValueChange={(value) => setScope(toScopeValue(value))}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="All accounts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All accounts</SelectItem>
          {typeOptions.length ? (
            <>
              <div className="px-3 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                By type
              </div>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </>
          ) : null}
          {institutionOptions.length ? (
            <>
              <div className="px-3 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                By institution
              </div>
              {institutionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </>
          ) : null}
          {accountOptions.length ? (
            <>
              <div className="px-3 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Accounts
              </div>
              {accountOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  );
}
