"use client";

/**
 * components/admin/team/InviteUserModal.tsx
 *
 * Modal for Owners to invite a new admin user.
 * Accepts email + role. Owner-only.
 */

import * as React from "react";
import { clsx } from "clsx";
import { X, Send, Loader2 } from "lucide-react";
import { sendAdminInvitationAction, directPromoteAdminAction } from "@/features/admin/actions/invitations.actions";

interface Role {
  id: string;
  key: string;
  name: string;
}

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  roles: Role[];
}

export function InviteUserModal({ open, onClose, roles }: InviteUserModalProps) {
  const [email, setEmail] = React.useState("");
  const [roleId, setRoleId] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [existingUserPrompt, setExistingUserPrompt] = React.useState<{
    email: string;
    role_id: string;
    roleName: string;
  } | null>(null);

  const defaultRoleId = React.useMemo(() => roles.find((r) => r.key !== "owner")?.id ?? "", [roles]);
  const activeRoleId = roleId || defaultRoleId;

  function reset() {
    setEmail("");
    setRoleId("");
    setMessage("");
    setError(null);
    setSuccess(false);
    setSuccessMessage(null);
    setExistingUserPrompt(null);
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  // ESC to close
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !activeRoleId) return;
    setLoading(true);
    setError(null);
    setExistingUserPrompt(null);
    const result = await sendAdminInvitationAction({ email, role_id: activeRoleId, message: message || undefined });
    setLoading(false);
    if (result.success) {
      setSuccess(true);
      setSuccessMessage(`Invitation sent to ${email}`);
    } else if (result.existingAuthUser) {
      setExistingUserPrompt({
        email: result.email || email,
        role_id: result.role_id || activeRoleId,
        roleName: result.roleName || roles.find((r) => r.id === activeRoleId)?.name || "Admin",
      });
    } else {
      setError(result.error || "Failed to send invitation");
    }
  }

  async function handleDirectPromote() {
    if (!existingUserPrompt) return;
    setLoading(true);
    setError(null);
    const result = await directPromoteAdminAction({
      email: existingUserPrompt.email,
      role_id: existingUserPrompt.role_id,
    });
    setLoading(false);
    if (result.success) {
      setExistingUserPrompt(null);
      setSuccess(true);
      setSuccessMessage(`${existingUserPrompt.email} was directly added as ${result.roleName || existingUserPrompt.roleName}!`);
    } else {
      setError(result.error || "Failed to add admin user.");
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
        className={clsx(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
          "rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)]",
          "bg-[var(--kit-surface)] p-6 shadow-xl"
        )}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="invite-modal-title" className="text-base font-semibold text-[var(--kit-text-primary)]">
              {existingUserPrompt ? "Directly Add Team Member" : "Invite Team Member"}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--kit-text-muted)]">
              {existingUserPrompt
                ? "This user already has a customer/registered account."
                : "An invitation email will be sent. It expires in 7 days."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {success ? (
          <div className="space-y-4 text-center py-4">
            <div className="text-3xl">✅</div>
            <p className="text-sm font-medium text-[var(--kit-text-primary)]">
              {successMessage || `Invitation sent to ${email}`}
            </p>
            <p className="text-xs text-[var(--kit-text-muted)]">
              {existingUserPrompt
                ? "The user now has admin privileges and will see an admin welcome notification."
                : "They will receive an email with a link to set up their account."}
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-2 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--kit-accent)]/90 transition-colors"
            >
              Done
            </button>
          </div>
        ) : existingUserPrompt ? (
          <div className="space-y-4 py-1">
            {error && (
              <div className="rounded-[var(--kit-radius-md)] bg-[var(--kit-danger)]/10 border border-[var(--kit-danger)]/20 p-3 text-xs text-[var(--kit-danger)]">
                {error}
              </div>
            )}
            <div className="rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)]/10 border border-[var(--kit-accent)]/20 p-4">
              <h3 className="text-sm font-semibold text-[var(--kit-text-primary)]">
                Existing Account Detected
              </h3>
              <p className="mt-1.5 text-xs text-[var(--kit-text-secondary)] leading-relaxed">
                <strong>{existingUserPrompt.email}</strong> is already registered in the system.
              </p>
              <p className="mt-2 text-xs font-medium text-[var(--kit-text-primary)]">
                Do you want to directly add them as{" "}
                <span className="text-[var(--kit-accent)] font-semibold">
                  {existingUserPrompt.roleName}
                </span>
                ?
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExistingUserPrompt(null)}
                disabled={loading}
                className="rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] px-3 py-2 text-xs font-medium text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDirectPromote}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--kit-accent)]/90 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : null}
                {loading ? "Adding..." : `Yes, Add as ${existingUserPrompt.roleName}`}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-[var(--kit-radius-md)] bg-[var(--kit-danger)]/10 border border-[var(--kit-danger)]/20 p-3 text-xs text-[var(--kit-danger)]">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="invite-email" className="text-xs font-medium text-[var(--kit-text-secondary)]">
                Email address <span className="text-[var(--kit-danger)]">*</span>
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoFocus
                className={clsx(
                  "w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-bg)] px-3 py-2 text-sm text-[var(--kit-text-primary)]",
                  "placeholder:text-[var(--kit-text-muted)] focus:border-[var(--kit-accent)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)]/20 transition-colors"
                )}
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label htmlFor="invite-role" className="text-xs font-medium text-[var(--kit-text-secondary)]">
                Role <span className="text-[var(--kit-danger)]">*</span>
              </label>
              <select
                id="invite-role"
                value={activeRoleId}
                onChange={(e) => setRoleId(e.target.value)}
                required
                className={clsx(
                  "w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-bg)] px-3 py-2 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)]/20 transition-colors"
                )}
              >
                <option value="">Select a role…</option>
                {roles.filter((r) => r.key !== "owner").map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-[var(--kit-text-muted)]">
                Only Owners can be invited as Owner via bootstrap.
              </p>
            </div>

            {/* Optional message */}
            <div className="space-y-1.5">
              <label htmlFor="invite-message" className="text-xs font-medium text-[var(--kit-text-secondary)]">
                Personal message <span className="text-[var(--kit-text-muted)]">(optional)</span>
              </label>
              <textarea
                id="invite-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Welcome to the team…"
                className={clsx(
                  "w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-bg)] px-3 py-2 text-sm text-[var(--kit-text-primary)]",
                  "placeholder:text-[var(--kit-text-muted)] focus:border-[var(--kit-accent)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)]/20 transition-colors resize-none"
                )}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] px-3 py-2 text-xs font-medium text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !email || !activeRoleId}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-[var(--kit-radius-md)] px-4 py-2 text-xs font-semibold text-white transition-colors",
                  "bg-[var(--kit-accent)] hover:bg-[var(--kit-accent)]/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {loading ? "Sending…" : "Send Invitation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
