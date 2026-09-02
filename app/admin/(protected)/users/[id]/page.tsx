/**
 * app/admin/(protected)/users/[id]/page.tsx
 *
 * Admin User Detail Page — Server Component.
 * Guarded by requirePermission("manage_users").
 *
 * Renders the UsersTable scoped to a single user,
 * followed by the UserPermissionsPanel for per-user override management.
 */

import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/admin-guard";
import {
  listAdminUsersAction,
  getRolesAction,
  getAdminUserPermissionsAction,
} from "@/features/admin/actions/users.actions";
import { UsersTable } from "../UsersTable";
import { UserPermissionsPanel } from "../UserPermissionsPanel";
import { ArrowLeft, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Admin User Detail",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("manage_users");
  const { id } = await params;

  const [usersRes, rolesRes, permissionsRes] = await Promise.all([
    listAdminUsersAction(),
    getRolesAction(),
    getAdminUserPermissionsAction(id),
  ]);

  const allUsers = usersRes.success ? usersRes.users || [] : [];
  const targetUser = allUsers.filter((u) => u.id === id);
  const roles = rolesRes.success ? rolesRes.roles || [] : [];

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center gap-2">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-xs text-[var(--kit-muted-fg)] hover:text-[var(--kit-fg)] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Admin Users
        </Link>
      </div>

      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--kit-fg)]">
          Administrator Details
        </h1>
        <p className="text-xs text-[var(--kit-muted-fg)]">
          Viewing and managing administrator record{" "}
          <code className="font-mono">{id}</code>
        </p>
      </div>

      {/* User record table */}
      {targetUser.length === 0 ? (
        <div className="rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 text-xs text-[var(--kit-muted-fg)]">
          Administrator record not found.
        </div>
      ) : (
        <UsersTable
          users={targetUser}
          roles={roles}
          currentAuthUserId={usersRes.currentAuthUserId}
        />
      )}

      {/* Permission override panel */}
      {targetUser.length > 0 && (
        <>
          {permissionsRes.success ? (
            <UserPermissionsPanel
              adminId={id}
              roleName={permissionsRes.roleName}
              isProtectedOwner={permissionsRes.isProtectedOwner}
              initialPermissions={permissionsRes.permissions}
            />
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-4 text-xs text-[var(--kit-danger)]">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Failed to load permission overrides</p>
                <p className="mt-0.5 text-[var(--kit-danger)]/80">
                  {permissionsRes.error}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
