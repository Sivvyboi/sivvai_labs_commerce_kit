"use client";

/**
 * components/admin/team/InvitationsTable.tsx
 *
 * Displays the list of admin invitations with status badges,
 * resend actions (for pending and expired invitations), and revoke action.
 * Owner-only component.
 */

import * as React from "react";
import { clsx } from "clsx";
import {
  revokeAdminInvitationAction,
  resendAdminInvitationAction,
  directPromoteAdminAction,
} from "@/features/admin/actions/invitations.actions";
import {
  MailOpen,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  Send,
  AlertTriangle,
  X,
} from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  role_id?: string;
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

function getEffectiveStatus(inv: Invitation): "pending" | "accepted" | "expired" | "revoked" {
  if (inv.status === "accepted") return "accepted";
  if (inv.status === "revoked") return "revoked";
  if (inv.status === "expired" || new Date(inv.expires_at) < new Date()) return "expired";
  return "pending";
}

function StatusBadge({ status }: { status: "pending" | "accepted" | "expired" | "revoked" }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.revoked;
  const Icon = cfg.icon;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        cfg.color
      )}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

export function InvitationsTable({ invitations }: InvitationsTableProps) {
  const [mutations, setMutations] = React.useState<
    Record<string, { status?: Invitation["status"]; expires_at?: string }>
  >({});
  const [resendingId, setResendingId] = React.useState<string | null>(null);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const items = React.useMemo(() => {
    return invitations.map((inv) => {
      const mut = mutations[inv.id];
      if (!mut) return inv;
      return {
        ...inv,
        ...(mut.status ? { status: mut.status } : {}),
        ...(mut.expires_at ? { expires_at: mut.expires_at } : {}),
      };
    });
  }, [invitations, mutations]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--kit-radius-lg)] border border-dashed border-[var(--kit-border)] py-12">
        <MailOpen size={28} className="text-[var(--kit-text-muted)]" />
        <p className="text-sm font-medium text-[var(--kit-text-secondary)]">No invitations yet</p>
        <p className="text-xs text-[var(--kit-text-muted)]">Invite a team member to get started.</p>
      </div>
    );
  }

  async function handleResend(inv: Invitation) {
    if (resendingId || revokingId) return;
    setResendingId(inv.id);
    setFeedback(null);

    const result = await resendAdminInvitationAction(inv.id);
    setResendingId(null);

    if (result.success && result.invitation) {
      const updatedInv = result.invitation;
      setMutations((prev) => ({
        ...prev,
        [inv.id]: {
          status: "pending",
          expires_at: updatedInv.expires_at,
        },
      }));
      setFeedback({
        type: "success",
        message: `Invitation successfully resent to ${inv.email}. A new invite link has been emailed.`,
      });
    } else if (result.existingAuthUser) {
      const roleDisplayName = result.roleName || inv.roles?.name || "Admin";
      if (
        confirm(
          `User ${inv.email} already has a registered account.\n\nWould you like to directly add them as ${roleDisplayName} now?`
        )
      ) {
        const targetRoleId = result.role_id || inv.role_id;
        if (!targetRoleId) {
          setFeedback({
            type: "error",
            message: "Missing role identifier for direct promotion.",
          });
          return;
        }
        setResendingId(inv.id);
        const promoteResult = await directPromoteAdminAction({
          email: inv.email,
          role_id: targetRoleId,
        });
        setResendingId(null);
        if (promoteResult.success) {
          setMutations((prev) => ({
            ...prev,
            [inv.id]: {
              status: "accepted",
              expires_at: inv.expires_at,
            },
          }));
          setFeedback({
            type: "success",
            message: `User ${inv.email} was directly added to the admin team as ${promoteResult.roleName || roleDisplayName}.`,
          });
        } else {
          setFeedback({
            type: "error",
            message: promoteResult.error || "Failed to directly add user.",
          });
        }
      } else {
        setFeedback({
          type: "error",
          message: "Invitation was not resent because the user already has a registered account.",
        });
      }
    } else {
      setFeedback({
        type: "error",
        message: result.error || "Failed to resend invitation.",
      });
    }
  }

  async function handleRevoke(inv: Invitation) {
    if (resendingId || revokingId) return;
    if (
      !confirm(
        `Revoke invitation for ${inv.email}? The recipient will no longer be able to use the invite link.`
      )
    ) {
      return;
    }
    setRevokingId(inv.id);
    setFeedback(null);

    const result = await revokeAdminInvitationAction(inv.id);
    setRevokingId(null);

    if (result.success) {
      setMutations((prev) => ({
        ...prev,
        [inv.id]: {
          status: "revoked",
        },
      }));
      setFeedback({
        type: "success",
        message: `Invitation for ${inv.email} has been revoked.`,
      });
    } else {
      setFeedback({
        type: "error",
        message: result.error || "Failed to revoke invitation.",
      });
    }
  }

  return (
    <div className="space-y-3">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={clsx(
            "flex items-center justify-between gap-2 rounded-[var(--kit-radius-md)] p-3 text-xs border transition-all animate-in fade-in",
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)] transition-colors p-0.5"
            aria-label="Dismiss feedback"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Table */}
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
                <th className="px-4 py-3 text-right font-semibold text-[var(--kit-text-secondary)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv, idx) => {
                const effectiveStatus = getEffectiveStatus(inv);
                const isResending = resendingId === inv.id;
                const isRevoking = revokingId === inv.id;
                const isBusy = isResending || isRevoking;
                const anyBusy = Boolean(resendingId || revokingId);

                return (
                  <tr
                    key={inv.id}
                    className={clsx(
                      "border-b border-[var(--kit-border)] transition-colors hover:bg-[var(--kit-muted)]/20",
                      idx === items.length - 1 && "border-b-0",
                      isBusy && "opacity-70"
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--kit-text-primary)]">
                      {inv.email}
                    </td>
                    <td className="px-4 py-3 text-[var(--kit-text-secondary)]">
                      {inv.roles?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={effectiveStatus} />
                    </td>
                    <td className="px-4 py-3 text-[var(--kit-text-muted)]">
                      {inv.status === "accepted" && inv.accepted_at
                        ? `Accepted ${new Date(inv.accepted_at).toLocaleDateString()}`
                        : effectiveStatus === "expired"
                        ? "Expired"
                        : new Date(inv.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-[var(--kit-text-muted)]">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {effectiveStatus === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleResend(inv)}
                            disabled={anyBusy}
                            aria-label={`Resend invitation to ${inv.email}`}
                            className="flex items-center gap-1 rounded-[var(--kit-radius-sm)] px-2 py-1 text-[10px] font-medium text-[var(--kit-accent)] hover:bg-[var(--kit-accent)]/10 transition-colors disabled:opacity-50"
                          >
                            {isResending ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Send size={11} />
                            )}
                            Resend
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevoke(inv)}
                            disabled={anyBusy}
                            aria-label={`Revoke invitation for ${inv.email}`}
                            className="flex items-center gap-1 rounded-[var(--kit-radius-sm)] px-2 py-1 text-[10px] font-medium text-[var(--kit-danger)] hover:bg-[var(--kit-danger)]/10 transition-colors disabled:opacity-50"
                          >
                            {isRevoking ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Trash2 size={11} />
                            )}
                            Revoke
                          </button>
                        </div>
                      ) : effectiveStatus === "expired" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleResend(inv)}
                            disabled={anyBusy}
                            aria-label={`Resend expired invitation to ${inv.email}`}
                            className="flex items-center gap-1 rounded-[var(--kit-radius-sm)] px-2.5 py-1 text-[10px] font-medium text-[var(--kit-accent)] hover:bg-[var(--kit-accent)]/10 border border-[var(--kit-accent)]/30 rounded-[var(--kit-radius-sm)] transition-colors disabled:opacity-50"
                          >
                            {isResending ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Send size={11} />
                            )}
                            Resend
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--kit-text-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
