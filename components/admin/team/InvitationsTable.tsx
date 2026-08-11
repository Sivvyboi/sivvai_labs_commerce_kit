"use client";

/**
 * components/admin/team/InvitationsTable.tsx
 *
 * Displays the list of admin invitations with status badges and revoke action.
 * Owner-only component.
 */

import * as React from "react";
import { clsx } from "clsx";
import { revokeAdminInvitationAction } from "@/features/admin/actions/invitations.actions";
import { MailOpen, Clock, CheckCircle, XCircle, Trash2, Loader2 } from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  roles?: { key: string; name: string } | null;
}

interface InvitationsTableProps {
  invitations: Invitation[];
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-amber-500 bg-amber-500/10" },
  accepted: { label: "Accepted", icon: CheckCircle, color: "text-emerald-500 bg-emerald-500/10" },
  expired: { label: "Expired", icon: XCircle, color: "text-[var(--kit-text-muted)] bg-[var(--kit-muted)]" },
  revoked: { label: "Revoked", icon: XCircle, color: "text-[var(--kit-danger)] bg-[var(--kit-danger)]/10" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.revoked;
  const Icon = cfg.icon;
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", cfg.color)}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function RevokeButton({ invitationId }: { invitationId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function handleRevoke() {
    if (!confirm("Revoke this invitation? The recipient will no longer be able to use the invite link.")) return;
    setLoading(true);
    const result = await revokeAdminInvitationAction(invitationId);
    setLoading(false);
    if (result.success) setDone(true);
  }

  if (done) return <span className="text-[10px] text-[var(--kit-text-muted)]">Revoked</span>;

  return (
    <button
      type="button"
      onClick={handleRevoke}
      disabled={loading}
      aria-label="Revoke invitation"
      className="flex items-center gap-1 rounded-[var(--kit-radius-sm)] px-2 py-1 text-[10px] font-medium text-[var(--kit-danger)] hover:bg-[var(--kit-danger)]/10 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
      Revoke
    </button>
  );
}

export function InvitationsTable({ invitations }: InvitationsTableProps) {
  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--kit-radius-lg)] border border-dashed border-[var(--kit-border)] py-12">
        <MailOpen size={28} className="text-[var(--kit-text-muted)]" />
        <p className="text-sm font-medium text-[var(--kit-text-secondary)]">No invitations yet</p>
        <p className="text-xs text-[var(--kit-text-muted)]">Invite a team member to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-surface)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--kit-border)] bg-[var(--kit-muted)]/30">
              <th className="px-4 py-3 font-semibold text-[var(--kit-text-secondary)]">Email</th>
              <th className="px-4 py-3 font-semibold text-[var(--kit-text-secondary)]">Role</th>
              <th className="px-4 py-3 font-semibold text-[var(--kit-text-secondary)]">Status</th>
              <th className="px-4 py-3 font-semibold text-[var(--kit-text-secondary)]">Expires</th>
              <th className="px-4 py-3 font-semibold text-[var(--kit-text-secondary)]">Sent</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv, idx) => (
              <tr
                key={inv.id}
                className={clsx(
                  "border-b border-[var(--kit-border)] transition-colors hover:bg-[var(--kit-muted)]/20",
                  idx === invitations.length - 1 && "border-b-0"
                )}
              >
                <td className="px-4 py-3 font-medium text-[var(--kit-text-primary)]">{inv.email}</td>
                <td className="px-4 py-3 text-[var(--kit-text-secondary)]">{inv.roles?.name ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                <td className="px-4 py-3 text-[var(--kit-text-muted)]">
                  {inv.status === "accepted" && inv.accepted_at
                    ? `Accepted ${new Date(inv.accepted_at).toLocaleDateString()}`
                    : new Date(inv.expires_at) < new Date()
                    ? "Expired"
                    : new Date(inv.expires_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-[var(--kit-text-muted)]">
                  {new Date(inv.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {inv.status === "pending" && <RevokeButton invitationId={inv.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
