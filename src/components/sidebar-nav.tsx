"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  ClipboardCheck,
  Landmark,
  Layers,
  ShieldAlert,
  Wallet,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/transactions", label: "Transactions", icon: ClipboardList },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/categories", label: "Categories", icon: Layers },
  { href: "/budgets", label: "Budgets", icon: Wallet },
  { href: "/alerts", label: "Alerts", icon: ShieldAlert },
  { href: "/reconciliation", label: "Reconciliation", icon: ClipboardCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="rounded-2xl border bg-card/90 p-6 shadow-card-soft">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Ledgerly
          </p>
          <p className="text-2xl font-semibold">Personal Finance</p>
        </div>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          Beta
        </span>
      </div>
      <div className="mt-8 space-y-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-muted/60"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="mt-10 rounded-xl border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">Quick tips</p>
        <p className="mt-2">
          Use the Quick Add panel to log expenses in seconds and keep the table
          in sync.
        </p>
      </div>
    </div>
  );
}
