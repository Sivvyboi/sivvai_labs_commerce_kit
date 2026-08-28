/**
 * app/admin/(protected)/layout.tsx
 *
 * Admin Protected Root Layout — Server Component.
 * Enforces admin access, loads permissions, user context, and store settings currency at the boundary.
 */

import * as React from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { getCurrentAdminContext } from "@/services/authz-service";
import { getStoreSettings } from "@/services/store-service";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { AdminShell } from "@/components/admin/layout/AdminShell";
import { CurrencyProvider } from "@/components/shared/CurrencyProvider";
import { localizationConfig } from "@/config/localization";

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

  // Load full admin context (user + role + permissions) and store settings
  const [ctx, settings] = await Promise.all([
    getCurrentAdminContext(),
    getStoreSettings().catch(() => null),
  ]);

  const permissions = ctx?.permissions || [];
  const userEmail = ctx?.user.email || "";
  const roleName = ctx?.role?.name || "Admin";
  const currency = settings?.currency || localizationConfig.currency;

  return (
    <CurrencyProvider currency={currency}>
      <div className="flex h-dvh overflow-hidden bg-[var(--kit-bg)]">
        {/* Persistent sidebar — desktop only */}
        <AdminSidebar permissions={permissions} userEmail={userEmail} roleName={roleName} />

        {/* Right panel: header + mobile drawer + scrollable content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminShell permissions={permissions} userEmail={userEmail} roleName={roleName}>
            {children}
          </AdminShell>
        </div>
      </div>
    </CurrencyProvider>
  );
}
