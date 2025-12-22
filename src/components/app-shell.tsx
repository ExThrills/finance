"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { SidebarNav } from "@/components/sidebar-nav";
import { AccountScopeProvider } from "@/components/account-scope-context";
import { TopBar } from "@/components/top-bar";
import { supabaseBrowser } from "@/lib/supabase-browser";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = useMemo(() => pathname.startsWith("/auth"), [pathname]);
  const [checking, setChecking] = useState(!isAuthRoute);

  useEffect(() => {
    if (isAuthRoute) {
      setChecking(false);
      return;
    }

    let active = true;

    const checkSession = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!active) {
        return;
      }
      if (!data.session) {
        router.replace("/auth/sign-in");
      }
      setChecking(false);
    };

    checkSession();

    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        if (!session && !isAuthRoute) {
          router.replace("/auth/sign-in");
        }
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [isAuthRoute, router]);

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,240,219,0.7),_rgba(244,248,255,0.95),_rgba(236,238,247,0.9))]">
        {children}
      </div>
    );
  }

  if (checking) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,240,219,0.7),_rgba(244,248,255,0.95),_rgba(236,238,247,0.9))]">
      <AccountScopeProvider>
        <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-6 px-4 py-6 lg:flex-row">
          <aside className="lg:w-64">
            <SidebarNav />
          </aside>
          <main className="flex-1 rounded-2xl border bg-card/80 p-6 shadow-card-soft backdrop-blur-sm">
            <TopBar />
            <div className="mt-6">{children}</div>
          </main>
        </div>
      </AccountScopeProvider>
    </div>
  );
}
