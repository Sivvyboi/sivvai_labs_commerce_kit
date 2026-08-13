/**
 * app/admin/(protected)/team/invitations/page.tsx
 *
 * Team Invitations Page — Server Component.
 * Owner only (manage_users permission).
 */

import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/admin-guard";
import { listAdminInvitationsAction } from "@/features/admin/actions/invitations.actions";
import { getRolesAction } from "@/features/admin/actions/users.actions";
import { InvitationsPageClient } from "./InvitationsPageClient";
import { Users, MailOpen, Shield } from "lucide-react";

export const metadata: Metadata = { title: "Team · Invitations" };

export default async function TeamInvitationsPage() {
  await requirePermission("manage_users");

  const [invRes, rolesRes] = await Promise.all([
    listAdminInvitationsAction(),
    getRolesAction(),
  ]);

  const invitations = (invRes.success && invRes.invitations ? invRes.invitations : []) as unknown as Parameters<typeof InvitationsPageClient>[0]["invitations"];
  const roles = rolesRes.success ? rolesRes.roles || [] : [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--kit-text-primary)] flex items-center gap-2">
          <MailOpen size={20} className="text-[var(--kit-accent)]" />
          Team
        </h1>
        <p className="mt-0.5 text-xs text-[var(--kit-text-muted)]">
          Manage invitations and team access.
        </p>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex gap-1 border-b border-[var(--kit-border)]">
        <Link
          href="/admin/team/members"
          className="inline-flex items-center gap-1.5 px-3 pb-2 text-xs font-medium text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)] transition-colors border-b-2 border-transparent hover:border-[var(--kit-border)]"
        >
          <Users size={13} />
          Members
        </Link>
        <Link
          href="/admin/team/invitations"
          className="inline-flex items-center gap-1.5 px-3 pb-2 text-xs font-semibold text-[var(--kit-accent)] border-b-2 border-[var(--kit-accent)]"
        >
          <MailOpen size={13} />
          Invitations
        </Link>
        <Link
          href="/admin/activity"
          className="inline-flex items-center gap-1.5 px-3 pb-2 text-xs font-medium text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)] transition-colors border-b-2 border-transparent hover:border-[var(--kit-border)]"
        >
          <Shield size={13} />
          Audit History
        </Link>
      </div>

      {!invRes.success && (
        <div className="rounded-lg border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-4 text-xs text-[var(--kit-danger)]">
          {invRes.error || "Failed to load invitations"}
        </div>
      )}

      <InvitationsPageClient invitations={invitations} roles={roles} />
    </div>
  );
}
