/**
 * app/admin/(protected)/team/members/page.tsx
 *
 * Team Members Page — replaces /admin/users.
 * Guarded by requirePermission("manage_users").
 */

import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/admin-guard";
import { getCurrentAdminContext } from "@/services/authz-service";
import { listAdminUsersAction, getRolesAction } from "@/features/admin/actions/users.actions";
import { UsersTable } from "../../users/UsersTable";
import { Users, MailOpen, Shield } from "lucide-react";

export const metadata: Metadata = { title: "Team · Members" };

export default async function TeamMembersPage() {
  const [ctx] = await Promise.all([
    getCurrentAdminContext(),
    requirePermission("manage_users"),
  ]);

  const [usersRes, rolesRes] = await Promise.all([
    listAdminUsersAction(),
    getRolesAction(),
  ]);

  const users = usersRes.success ? usersRes.users || [] : [];
  const roles = rolesRes.success ? rolesRes.roles || [] : [];
  const isOwner = ctx?.role?.key === "owner";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--kit-text-primary)] flex items-center gap-2">
            <Users size={20} className="text-[var(--kit-accent)]" />
            Team
          </h1>
          <p className="mt-0.5 text-xs text-[var(--kit-text-muted)]">
            Manage administrator accounts, roles, and access permissions.
          </p>
        </div>

        {/* Owner-only: Invite User */}
        {isOwner && (
          <Link
            href="/admin/team/invitations"
            className="inline-flex items-center gap-1.5 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--kit-accent)]/90 transition-colors"
          >
            <MailOpen size={13} />
            Invite User
          </Link>
        )}
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex gap-1 border-b border-[var(--kit-border)]">
        <Link
          href="/admin/team/members"
          className="inline-flex items-center gap-1.5 px-3 pb-2 text-xs font-semibold text-[var(--kit-accent)] border-b-2 border-[var(--kit-accent)]"
        >
          <Users size={13} />
          Members
        </Link>
        {isOwner && (
          <Link
            href="/admin/team/invitations"
            className="inline-flex items-center gap-1.5 px-3 pb-2 text-xs font-medium text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)] transition-colors border-b-2 border-transparent hover:border-[var(--kit-border)]"
          >
            <MailOpen size={13} />
            Invitations
          </Link>
        )}
        <Link
          href="/admin/activity"
          className="inline-flex items-center gap-1.5 px-3 pb-2 text-xs font-medium text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)] transition-colors border-b-2 border-transparent hover:border-[var(--kit-border)]"
        >
          <Shield size={13} />
          Audit History
        </Link>
      </div>

      {!usersRes.success && (
        <div className="rounded-lg border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-4 text-xs text-[var(--kit-danger)]">
          {usersRes.error || "Failed to load team members"}
        </div>
      )}

      <UsersTable users={users} roles={roles} currentAuthUserId={usersRes.currentAuthUserId} />
    </div>
  );
}
