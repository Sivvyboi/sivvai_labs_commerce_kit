"use client";

/**
 * components/admin/layout/AdminShell.tsx
 *
 * Client wrapper that wires AdminHeader ↔ AdminMobileDrawer open state.
 * Kept as a thin Client boundary so app/(admin)/layout.tsx stays a Server Component.
 */

import * as React from "react";
import { AdminHeader } from "./AdminHeader";
import { AdminMobileDrawer } from "./AdminMobileDrawer";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <>
      <AdminMobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex min-h-dvh flex-col">
        <AdminHeader onMenuOpen={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </>
  );
}
