/**
 * app/admin/(protected)/users/[id]/page.tsx
 *
 * Admin User Detail Page — Server Component.
 * Guarded by requirePermission("manage_users").
 */

import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/admin-guard";
import { listAdminUsersAction, getRolesAction } from "@/features/admin/actions/users.actions";
import { UsersTable } from "../UsersTable";
import { ArrowLeft } from "lucide-react";

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

  const [usersRes, rolesRes] = await Promise.all([
    listAdminUsersAction(),
    getRolesAction(),
  ]);

  const allUsers = usersRes.success ? usersRes.users || [] : [];
  const targetUser = allUsers.filter((u) => u.id === id);
  const roles = rolesRes.success ? rolesRes.roles || [] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-xs text-[var(--kit-muted-fg)] hover:text-[var(--kit-fg)] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Admin Users
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--kit-fg)]">
          Administrator Details
        </h1>
        <p className="text-xs text-[var(--kit-muted-fg)]">
          Viewing and managing administrator record <code className="font-mono">{id}</code>
        </p>
      </div>

      {targetUser.length === 0 ? (
        <div className="rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 text-xs text-[var(--kit-muted-fg)]">
          Administrator record not found.
        </div>
      ) : (
        <UsersTable users={targetUser} roles={roles} currentAuthUserId={usersRes.currentAuthUserId} />
      )}
    </div>
  );
}
