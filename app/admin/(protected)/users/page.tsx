/**
 * app/admin/(protected)/users/page.tsx
 *
 * Admin User Management Page — Server Component.
 * Guarded by requirePermission("manage_users").
 */

import React from "react";
import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/admin-guard";
import { listAdminUsersAction, getRolesAction } from "@/features/admin/actions/users.actions";
import { UsersTable } from "./UsersTable";
import { UserCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Admin Users",
};

export default async function AdminUsersPage() {
  await requirePermission("manage_users");

  const [usersRes, rolesRes] = await Promise.all([
    listAdminUsersAction(),
    getRolesAction(),
  ]);

  const users = usersRes.success ? usersRes.users || [] : [];
  const roles = rolesRes.success ? rolesRes.roles || [] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--kit-fg)] flex items-center gap-2">
            <UserCheck size={20} className="text-[var(--kit-primary)]" />
            Administrator Management
          </h1>
          <p className="text-xs text-[var(--kit-muted-fg)]">
            Manage administrator accounts, assign roles, and control access permissions.
          </p>
        </div>
      </div>

      {!usersRes.success && (
        <div className="rounded-lg border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-4 text-xs text-[var(--kit-danger)]">
          {usersRes.error || "Failed to load admin users"}
        </div>
      )}

      <UsersTable users={users} roles={roles} currentAuthUserId={usersRes.currentAuthUserId} />
    </div>
  );
}
