"use client";

/**
 * components/admin/layout/AdminShell.tsx
 *
 * Client wrapper that wires AdminHeader ↔ AdminMobileDrawer open state.
 * Passes permissions and user identity to the mobile drawer.
 */

import * as React from "react";
import { AdminHeader } from "./AdminHeader";
import { AdminMobileDrawer } from "./AdminMobileDrawer";

interface AdminShellProps {
  children: React.ReactNode;
  permissions?: string[];
  userEmail?: string;
  roleName?: string;
}

export function AdminShell({ children, permissions = [], userEmail = "", roleName = "" }: AdminShellProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <>
      <AdminMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        permissions={permissions}
        userEmail={userEmail}
        roleName={roleName}
      />
      <div className="flex min-h-dvh flex-col">
        <AdminHeader onMenuOpen={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </>
  );
}
