/**
 * app/admin/(protected)/team/audit/page.tsx
 *
 * Team Audit History Page — Server Component.
 * Displays administrative events from the immutable audit_logs table.
 * Guarded by requirePermissionPage("view_activity").
 */

import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { requirePermissionPage } from "@/lib/auth/admin-guard";
import { listAuditLogsAction } from "@/features/admin/actions/audit.actions";
import { AuditLogsTable } from "@/components/admin/tables/AuditLogsTable";
import { Pagination } from "@/components/admin/ui/Pagination";
import { Shield, Users, MailOpen } from "lucide-react";

export const metadata: Metadata = { title: "Team · Audit History" };

interface TeamAuditPageProps {
  searchParams: Promise<{
    offset?: string;
    action?: string;
  }>;
}

export default async function TeamAuditPage({ searchParams }: TeamAuditPageProps) {
  const ctx = await requirePermissionPage("view_activity");
  const params = await searchParams;

  const offset = Number(params.offset ?? 0);
  const limit = 25;
  const actionFilter = params.action;

  const isOwner = ctx?.role?.key === "owner";
  const canManageUsers = ctx.permissions.includes("manage_users");

  const auditRes = await listAuditLogsAction({
    limit,
    offset,
    action: actionFilter,
  });

  const logs = auditRes.success && auditRes.logs ? auditRes.logs : [];
  const count = auditRes.count ?? logs.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--kit-text-primary)] flex items-center gap-2">
            <Shield size={20} className="text-[var(--kit-accent)]" />
            Audit History
          </h1>
          <p className="mt-0.5 text-xs text-[var(--kit-text-muted)]">
            Immutable administrative security and operations audit log ({count} total events).
          </p>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex gap-1 border-b border-[var(--kit-border)]">
        {canManageUsers && (
          <Link
            href="/admin/team/members"
            className="inline-flex items-center gap-1.5 px-3 pb-2 text-xs font-medium text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)] transition-colors border-b-2 border-transparent hover:border-[var(--kit-border)]"
          >
            <Users size={13} />
            Members
          </Link>
        )}
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
          href="/admin/team/audit"
          className="inline-flex items-center gap-1.5 px-3 pb-2 text-xs font-semibold text-[var(--kit-accent)] border-b-2 border-[var(--kit-accent)]"
        >
          <Shield size={13} />
          Audit History
        </Link>
      </div>

      {!auditRes.success && (
        <div className="rounded-lg border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-4 text-xs text-[var(--kit-danger)]">
          {auditRes.error || "Failed to load audit history"}
        </div>
      )}

      {/* Audit Table & Pagination */}
      <AuditLogsTable logs={logs} />

      <Pagination
        total={count}
        limit={limit}
        offset={offset}
        basePath="/admin/team/audit"
        searchParams={{ action: actionFilter }}
      />
    </div>
  );
}
