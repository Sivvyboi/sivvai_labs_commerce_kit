"use client";

/**
 * components/admin/team/MemberPermissionsModal.tsx
 *
 * Store-themed modal dialog for managing granular per-user permission overrides.
 * Allows Owners to grant or deny individual permissions (e.g. manage_products, manage_inventory)
 * to administrators (such as Support or Editor) beyond their base role baseline.
 */

import React, { useState, useEffect } from "react";
import { clsx } from "clsx";
import { X, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import {
  getAdminUserPermissionsAction,
  type AdminUserPermissionRow,
} from "@/features/admin/actions/users.actions";
import { UserPermissionsPanel } from "@/app/admin/(protected)/users/UserPermissionsPanel";

interface MemberPermissionsModalProps {
  open: boolean;
  onClose: () => void;
  adminUser: {
    id: string;
    email: string;
    roleName: string | null;
    isProtectedOwner?: boolean;
  };
}

export function MemberPermissionsModal({
  open,
  onClose,
  adminUser,
}: MemberPermissionsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<AdminUserPermissionRow[]>([]);
  const [roleName, setRoleName] = useState<string | null>(adminUser.roleName);
  const [isProtectedOwner, setIsProtectedOwner] = useState<boolean>(
    adminUser.isProtectedOwner ?? false
  );

  useEffect(() => {
    if (!open || !adminUser.id) return;
    let isCancelled = false;

    async function loadPermissions() {
      setLoading(true);
      setError(null);
      const res = await getAdminUserPermissionsAction(adminUser.id);
      if (isCancelled) return;

      if (res.success) {
        setPermissions(res.permissions);
        if (res.roleName) setRoleName(res.roleName);
        setIsProtectedOwner(res.isProtectedOwner);
      } else {
        setError(res.error || "Failed to load member permissions.");
      }
      setLoading(false);
    }

    loadPermissions();

    return () => {
      isCancelled = true;
    };
  }, [open, adminUser.id]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-permissions-modal-title"
        className={clsx(
          "relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-[var(--kit-radius-lg)]",
          "border border-[var(--kit-border)] bg-[var(--kit-surface)] shadow-2xl z-10",
          "animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--kit-border)] px-6 py-4 bg-[var(--kit-bg)]/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] border border-[var(--kit-accent)]/20">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="member-permissions-modal-title"
                  className="text-base font-semibold text-[var(--kit-text-primary)]"
                >
                  Granular Permissions
                </h2>
                {roleName && (
                  <span className="rounded-full bg-[var(--kit-accent)]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--kit-accent)] border border-[var(--kit-accent)]/20">
                    {roleName}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--kit-text-muted)]">
                Configuring access for <strong>{adminUser.email}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--kit-text-muted)]">
              <Loader2 size={24} className="animate-spin text-[var(--kit-accent)]" />
              <p className="text-xs">Loading permissions matrix…</p>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-lg border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-4 text-xs text-[var(--kit-danger)]">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Unable to load permissions</p>
                <p className="mt-0.5 text-[var(--kit-danger)]/80">{error}</p>
              </div>
            </div>
          ) : (
            <UserPermissionsPanel
              adminId={adminUser.id}
              roleName={roleName}
              isProtectedOwner={isProtectedOwner}
              initialPermissions={permissions}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--kit-border)] px-6 py-3.5 bg-[var(--kit-bg)]/40">
          <p className="text-[11px] text-[var(--kit-text-muted)]">
            Overrides are applied immediately to PostgreSQL RLS and Admin Console routing.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--kit-accent)]/90 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
