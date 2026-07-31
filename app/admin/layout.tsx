/**
 * app/(admin)/layout.tsx
 *
 * Admin Root Layout — Server Component.
 *
 * Structure:
 *  requireAdmin()                — guard (no-op now, swap when auth ships)
 *  <html body> already provided by root layout
 *  ┌─────────────────────────────────────────┐
 *  │ AdminSidebar (desktop, lg:flex hidden)  │
 *  │ AdminShell (Client boundary)            │
 *  │   AdminMobileDrawer (mobile overlay)   │
 *  │   AdminHeader (top bar + breadcrumbs)  │
 *  │   <main> {children} </main>            │
 *  └─────────────────────────────────────────┘
 *
 * Reference:
 * → node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md
 */

import * as React from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin-guard";
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
  // Enforce admin access — currently a no-op; see lib/auth/admin-guard.ts
  await requireAdmin();

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--kit-bg)]">
      {/* Persistent sidebar — desktop only */}
      <AdminSidebar />

      {/* Right panel: header + scrollable content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminShell>{children}</AdminShell>
      </div>
    </div>
  );
}
