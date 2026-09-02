"use client";

/**
 * app/admin/(protected)/users/UserPermissionsPanel.tsx
 *
 * Client Component: Per-User Permission Override Panel.
 *
 * Renders the full permission matrix for a target admin user, showing:
 *   - Role: whether their base role grants the permission
 *   - Override: current user-level override (Inherit / Grant / Deny)
 *   - Effective: computed result
 *
 * Three-state toggle controls allow an Owner to set per-user overrides.
 * manage_users is presented as a locked system permission with no controls.
 * Protected Owners render as fully read-only with an explanatory banner.
 */

import React, { useState, useTransition } from "react";
import { clsx } from "clsx";
import {
  ShieldCheck,
  Lock,
  Check,
  Minus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  setAdminUserPermissionOverrideAction,
  type AdminUserPermissionRow,
  type PermissionOverrideMode,
} from "@/features/admin/actions/users.actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPermissionName(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EffectiveBadge({ effective }: { effective: boolean }) {
  return effective ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--kit-success)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--kit-success)] border border-[var(--kit-success)]/20">
      <CheckCircle2 size={10} />
      Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--kit-danger)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--kit-danger)] border border-[var(--kit-danger)]/20">
      <XCircle size={10} />
      No
    </span>
  );
}

function RoleBadge({ fromRole }: { fromRole: boolean }) {
  return fromRole ? (
    <span className="inline-flex items-center gap-0.5 text-[var(--kit-success)] font-semibold text-xs">
      <Check size={13} />
    </span>
  ) : (
    <span className="text-[var(--kit-text-muted)] text-xs">
      <Minus size={13} />
    </span>
  );
}

interface OverrideToggleProps {
  permissionId: string;
  adminId: string;
  current: PermissionOverrideMode;
  disabled: boolean;
  onSuccess: (permissionId: string, newMode: PermissionOverrideMode) => void;
  onError: (permissionId: string, error: string) => void;
}

function OverrideToggle({
  permissionId,
  adminId,
  current,
  disabled,
  onSuccess,
  onError,
}: OverrideToggleProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = (mode: PermissionOverrideMode) => {
    if (mode === current || disabled) return;
    startTransition(async () => {
      const res = await setAdminUserPermissionOverrideAction({
        adminId,
        permissionId,
        mode,
      });
      if (res.success) {
        onSuccess(permissionId, mode);
      } else {
        onError(permissionId, res.error ?? "Unknown error");
      }
    });
  };

  const btnBase =
    "h-7 px-2.5 text-[11px] font-semibold transition-all rounded-[var(--kit-radius-sm)] border focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div
      className={clsx(
        "inline-flex rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] overflow-hidden",
        isPending && "opacity-60"
      )}
      role="group"
      aria-label="Override mode"
    >
      {(["inherit", "grant", "deny"] as PermissionOverrideMode[]).map((mode) => {
        const isActive = current === mode;
        return (
          <button
            key={mode}
            type="button"
            disabled={disabled || isPending}
            onClick={() => handleClick(mode)}
            aria-pressed={isActive}
            className={clsx(
              btnBase,
              "border-0 rounded-none",
              mode !== "inherit" && "border-l border-[var(--kit-border)]",
              isActive
                ? mode === "grant"
                  ? "bg-[var(--kit-success)] text-white"
                  : mode === "deny"
                  ? "bg-[var(--kit-danger)] text-white"
                  : "bg-[var(--kit-accent)] text-white"
                : "bg-[var(--kit-bg)] text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)]"
            )}
          >
            {mode === "inherit" ? (
              <span className="flex items-center gap-1">
                <RefreshCw size={10} />
                Inherit
              </span>
            ) : mode === "grant" ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 size={10} />
                Grant
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <XCircle size={10} />
                Deny
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface UserPermissionsPanelProps {
  adminId: string;
  roleName: string | null;
  isProtectedOwner: boolean;
  initialPermissions: AdminUserPermissionRow[];
}

export function UserPermissionsPanel({
  adminId,
  roleName,
  isProtectedOwner,
  initialPermissions,
}: UserPermissionsPanelProps) {
  // Local state mirrors permission rows so UI updates immediately on success
  const [permissions, setPermissions] = useState<AdminUserPermissionRow[]>(initialPermissions);
  // Per-row error messages
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const handleOverrideSuccess = (permissionId: string, newMode: PermissionOverrideMode) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.id !== permissionId) return p;

        let effective: boolean;
        if (newMode === "grant") {
          effective = true;
        } else if (newMode === "deny") {
          effective = false;
        } else {
          // inherit: fall back to role
          effective = p.from_role;
        }

        return { ...p, override: newMode, effective };
      })
    );
    // Clear any previous error for this row
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[permissionId];
      return next;
    });
  };

  const handleOverrideError = (permissionId: string, error: string) => {
    setRowErrors((prev) => ({ ...prev, [permissionId]: error }));
  };

  return (
    <section
      className="rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] overflow-hidden"
      aria-label="Permission overrides"
    >
      {/* Panel header */}
      <div className="flex items-start justify-between gap-4 border-b border-[var(--kit-border)] bg-[var(--kit-bg)]/50 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--kit-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">
              Permission Overrides
            </h2>
            {roleName && (
              <span className="rounded-full bg-[var(--kit-accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--kit-accent)] border border-[var(--kit-accent)]/20">
                {roleName}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[var(--kit-text-muted)]">
            Effective permission{" "}
            <code className="rounded bg-[var(--kit-muted)] px-1 py-0.5 text-[10px]">
              (role ∪ grants) − denies
            </code>
            . Changes take effect immediately.
          </p>
        </div>
      </div>

      {/* Protected Owner banner */}
      {isProtectedOwner && (
        <div className="flex items-start gap-3 border-b border-[var(--kit-warning)]/20 bg-[var(--kit-warning)]/8 px-5 py-3.5">
          <ShieldCheck size={16} className="mt-0.5 flex-shrink-0 text-[var(--kit-warning)]" />
          <div>
            <p className="text-xs font-semibold text-[var(--kit-warning)]">
              Protected Owner — overrides are not permitted
            </p>
            <p className="text-[11px] text-[var(--kit-text-muted)] mt-0.5">
              This account is designated as a Protected Owner. It retains full system access
              regardless of role or override configuration. Per-user permission overrides cannot be
              applied to protected Owner accounts.
            </p>
          </div>
        </div>
      )}

      {/* Permission table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[var(--kit-border)] bg-[var(--kit-bg)]/30">
            <tr>
              <th className="px-5 py-3 font-semibold text-[var(--kit-text-muted)] uppercase tracking-wider w-[36%]">
                Permission
              </th>
              <th className="px-4 py-3 font-semibold text-[var(--kit-text-muted)] uppercase tracking-wider w-[10%]">
                Role
              </th>
              <th className="px-4 py-3 font-semibold text-[var(--kit-text-muted)] uppercase tracking-wider w-[36%]">
                Override
              </th>
              <th className="px-4 py-3 font-semibold text-[var(--kit-text-muted)] uppercase tracking-wider w-[18%]">
                Effective
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--kit-border)]">
            {permissions.map((perm) => {
              const rowError = rowErrors[perm.id];

              return (
                <React.Fragment key={perm.id}>
                  <tr
                    className={clsx(
                      "hover:bg-[var(--kit-bg)]/20 transition-colors",
                      perm.is_locked && "opacity-70"
                    )}
                  >
                    {/* Permission name + description */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[var(--kit-text-primary)]">
                          {formatPermissionName(perm.key)}
                        </span>
                        {perm.is_locked && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded bg-[var(--kit-muted)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--kit-text-muted)] border border-[var(--kit-border)]"
                            title="Owner-only system permission — cannot be overridden"
                          >
                            <Lock size={8} />
                            Owner-Only
                          </span>
                        )}
                      </div>
                      {perm.description && (
                        <p className="mt-0.5 text-[10px] text-[var(--kit-text-muted)] leading-relaxed">
                          {perm.description}
                        </p>
                      )}
                    </td>

                    {/* Role baseline */}
                    <td className="px-4 py-3">
                      <RoleBadge fromRole={perm.from_role} />
                    </td>

                    {/* Override toggle */}
                    <td className="px-4 py-3">
                      {perm.is_locked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--kit-text-muted)] italic">
                          <Lock size={11} />
                          System-controlled
                        </span>
                      ) : isProtectedOwner ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--kit-text-muted)] italic">
                          <ShieldCheck size={11} />
                          Protected
                        </span>
                      ) : (
                        <OverrideToggle
                          permissionId={perm.id}
                          adminId={adminId}
                          current={perm.override}
                          disabled={false}
                          onSuccess={handleOverrideSuccess}
                          onError={handleOverrideError}
                        />
                      )}
                    </td>

                    {/* Effective */}
                    <td className="px-4 py-3">
                      <EffectiveBadge effective={perm.effective} />
                    </td>
                  </tr>

                  {/* Inline error row */}
                  {rowError && (
                    <tr>
                      <td colSpan={4} className="px-5 py-2">
                        <div className="flex items-center gap-2 rounded-[var(--kit-radius-sm)] bg-[var(--kit-danger)]/8 border border-[var(--kit-danger)]/20 px-3 py-2 text-[11px] text-[var(--kit-danger)]">
                          <AlertCircle size={12} className="flex-shrink-0" />
                          {rowError}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="border-t border-[var(--kit-border)] bg-[var(--kit-bg)]/30 px-5 py-3">
        <p className="text-[10px] text-[var(--kit-text-muted)]">
          <strong>Inherit</strong> uses the role&apos;s default. <strong>Grant</strong> adds access
          regardless of role. <strong>Deny</strong> removes access even if the role grants it.
          Changes are applied immediately and logged to the audit trail.
        </p>
      </div>
    </section>
  );
}
