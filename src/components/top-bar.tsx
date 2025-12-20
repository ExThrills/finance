"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, Plus } from "lucide-react";
import { toast } from "sonner";

import { AccountScopeSwitcher } from "@/components/account-scope-switcher";
import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/api-client";
import type { AlertRecord } from "@/types/finance";

export function TopBar() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchJson<AlertRecord[]>("/api/alerts");
        setAlerts(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load alerts.";
        toast.error(message);
      }
    };
    load();
  }, []);

  const unreadCount = useMemo(
    () => alerts.filter((alert) => !alert.acknowledgedAt).length,
    [alerts]
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Ledgerly
        </p>
        <p className="text-lg font-semibold">Portfolio view</p>
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-4 lg:justify-center">
        <AccountScopeSwitcher />
      </div>
      <div className="flex items-center gap-3">
        <Button asChild className="gap-2">
          <Link href="/transactions">
            <Plus className="h-4 w-4" />
            Add transaction
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label="View alerts"
          className="relative"
        >
          <Link href="/alerts">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            ) : null}
          </Link>
        </Button>
      </div>
    </div>
  );
}
