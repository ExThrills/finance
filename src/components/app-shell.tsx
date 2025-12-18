import * as React from "react";

import { SidebarNav } from "@/components/sidebar-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,240,219,0.7),_rgba(244,248,255,0.95),_rgba(236,238,247,0.9))]">
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="lg:w-64">
          <SidebarNav />
        </aside>
        <main className="flex-1 rounded-2xl border bg-card/80 p-6 shadow-card-soft backdrop-blur-sm">
          {children}
        </main>
      </div>
    </div>
  );
}
