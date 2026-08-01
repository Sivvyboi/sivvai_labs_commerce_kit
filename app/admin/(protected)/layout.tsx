/**
 * app/admin/(protected)/layout.tsx
 *
 * Admin Protected Root Layout — Server Component.
 * Enforces admin access, loads permissions once at the boundary, and passes to layout components.
 */

import * as React from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { getAdminPermissions } from "@/lib/auth/permissions";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { AdminShell } from "@/components/admin/layout/AdminShell";

export const metadata: Metadata = {
  title: {
    template: "%s · Admin Console",
    default: "Admin Console",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce admin authentication
  await requireAdmin();

  // Load user permissions once for the layout components
  const permissions = await getAdminPermissions();

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--kit-bg)]">
      {/* Persistent sidebar — desktop only */}
      <AdminSidebar permissions={permissions} />

      {/* Right panel: header + mobile drawer + scrollable content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminShell permissions={permissions}>{children}</AdminShell>
      </div>
    </div>
  );
}
