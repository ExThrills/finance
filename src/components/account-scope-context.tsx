"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AccountScope = {
  kind: "all" | "account" | "type" | "institution";
  value?: string;
};

type AccountScopeContextValue = {
  scope: AccountScope;
  setScope: (scope: AccountScope) => void;
};

const AccountScopeContext = createContext<AccountScopeContextValue | null>(null);

const defaultScope: AccountScope = { kind: "all" };
const storageKey = "ledgerly.accountScope";

export function AccountScopeProvider({ children }: { children: React.ReactNode }) {
  const [scope, setScopeState] = useState<AccountScope>(defaultScope);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AccountScope;
        if (parsed && typeof parsed.kind === "string") {
          setScopeState(parsed);
        }
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  const setScope = (next: AccountScope) => {
    setScopeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    }
  };

  const value = useMemo(() => ({ scope, setScope }), [scope]);

  return (
    <AccountScopeContext.Provider value={value}>
      {children}
    </AccountScopeContext.Provider>
  );
}

export function useAccountScope() {
  const ctx = useContext(AccountScopeContext);
  if (!ctx) {
    throw new Error("useAccountScope must be used within AccountScopeProvider");
  }
  return ctx;
}
