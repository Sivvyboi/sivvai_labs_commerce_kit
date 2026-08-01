"use client";

/**
 * app/admin/(protected)/users/UsersTable.tsx
 *
 * Client Component for Administrator Users table with Role selection and Status toggling.
 * Enforces self-action prevention, protected owner badges, and triggers ConfirmOwnerActionModal.
 */

import React, { useState, useTransition } from "react";
import { updateAdminRoleAction, deactivateAdminUserAction, reactivateAdminUserAction } from "@/features/admin/actions/users.actions";
import { ConfirmOwnerActionModal } from "@/components/admin/ui/ConfirmOwnerActionModal";
import { clsx } from "clsx";
import { UserCheck, UserX, ShieldCheck, Lock } from "lucide-react";

interface AdminUserItem {
  id: string;
  auth_user_id: string;
  role_id: string | null;
  is_active: boolean;
  is_protected_owner?: boolean;
  created_at: string;
  updated_at: string;
  email: string;
  last_sign_in_at: string | null;
  role: { id: string; key: string; name: string } | null;
}

interface RoleItem {
  id: string;
  key: string;
  name: string;
  description: string | null;
}

interface ModalState {
  open: boolean;
  title: string;
  description: string;
  expectedVerificationText: string;
  action: (password: string, reason: string) => Promise<{ success: boolean; error?: string }>;
}

export function UsersTable({
  users,
  roles,
  currentAuthUserId,
}: {
  users: AdminUserItem[];
  roles: RoleItem[];
  currentAuthUserId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    title: "",
    description: "",
    expectedVerificationText: "",
    action: async () => ({ success: false }),
  });

  const handleRoleSelect = (user: AdminUserItem, newRoleId: string) => {
    const newRole = roles.find((r) => r.id === newRoleId);
    const isCurrentOwner = user.role?.key === "owner";
    const isNewOwner = newRole?.key === "owner";

    // Sensitive change (Owner demotion or promotion) requires 2-step verification modal
    if (isCurrentOwner || isNewOwner) {
      const isDemotion = isCurrentOwner && !isNewOwner;
      const expectedText = isDemotion ? "REMOVE OWNER" : "PROMOTE OWNER";

      setModalState({
        open: true,
        title: isDemotion ? `Demote Owner Access: ${user.email}` : `Grant Owner Privileges: ${user.email}`,
        description: isDemotion
          ? `You are about to remove Owner privileges from ${user.email}. This will reduce administrative permissions for this account.`
          : `You are about to grant full Owner privileges to ${user.email}. They will gain access to all store settings and user management.`,
        expectedVerificationText: expectedText,
        action: async (password: string, reason: string) => {
          return await updateAdminRoleAction({
            adminId: user.id,
            roleId: newRoleId,
            password,
            reason,
          });
        },
      });
      return;
    }

    // Standard non-owner role update
    startTransition(async () => {
      const res = await updateAdminRoleAction({
        adminId: user.id,
        roleId: newRoleId,
      });
      if (!res.success) {
        alert(res.error || "Failed to update role");
      }
    });
  };

  const handleDeactivateClick = (user: AdminUserItem) => {
    const isOwner = user.role?.key === "owner";

    if (isOwner) {
      setModalState({
        open: true,
        title: `Deactivate Owner Account: ${user.email}`,
        description: `You are about to deactivate the Owner account for ${user.email}. All active sessions for this account will be immediately revoked.`,
        expectedVerificationText: "DEACTIVATE OWNER",
        action: async (password: string, reason: string) => {
          return await deactivateAdminUserAction({
            adminId: user.id,
            password,
            reason,
          });
        },
      });
      return;
    }

    if (!confirm(`Are you sure you want to deactivate administrator ${user.email}?`)) return;

    startTransition(async () => {
      const res = await deactivateAdminUserAction({ adminId: user.id });
      if (!res.success) {
        alert(res.error || "Failed to deactivate administrator");
      }
    });
  };

  const handleReactivateClick = (user: AdminUserItem) => {
    startTransition(async () => {
      const res = await reactivateAdminUserAction(user.id);
      if (!res.success) {
        alert(res.error || "Failed to reactivate administrator");
      }
    });
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)]">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[var(--kit-border)] bg-[var(--kit-bg)]/50 text-[var(--kit-muted-fg)] uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-4 py-3">Administrator</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Active</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--kit-border)] text-[var(--kit-fg)]">
            {users.map((u) => {
              const isSelf = u.auth_user_id === currentAuthUserId;
              const isProtected = u.is_protected_owner;

              return (
                <tr key={u.id} className="hover:bg-[var(--kit-bg)]/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{u.email}</span>
                      {isSelf && (
                        <span className="rounded bg-[var(--kit-accent)]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--kit-accent)]">
                          You
                        </span>
                      )}
                      {isProtected && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-[var(--kit-warning)]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--kit-warning)] border border-[var(--kit-warning)]/20" title="Primary Protected Owner account">
                          <ShieldCheck size={10} /> Protected
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--kit-muted-fg)] font-mono">{u.id}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    {isSelf || isProtected ? (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--kit-muted-fg)]">
                        <Lock size={12} />
                        {u.role?.name || "No Role"}
                      </span>
                    ) : (
                      <select
                        value={u.role_id || ""}
                        disabled={isPending}
                        onChange={(e) => handleRoleSelect(u, e.target.value)}
                        className="rounded-lg border border-[var(--kit-border)] bg-[var(--kit-bg)] px-2.5 py-1 text-xs text-[var(--kit-fg)] focus:border-[var(--kit-primary)] focus:outline-none"
                      >
                        <option value="" disabled>Select Role</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        u.is_active
                          ? "bg-[var(--kit-success)]/10 text-[var(--kit-success)] border border-[var(--kit-success)]/20"
                          : "bg-[var(--kit-danger)]/10 text-[var(--kit-danger)] border border-[var(--kit-danger)]/20"
                      )}
                    >
                      {u.is_active ? <UserCheck size={10} /> : <UserX size={10} />}
                      {u.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[var(--kit-muted-fg)]">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {isSelf || isProtected ? (
                      <span className="text-[11px] text-[var(--kit-muted-fg)] italic">
                        {isSelf ? "Current User" : "Protected"}
                      </span>
                    ) : u.is_active ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDeactivateClick(u)}
                        className="rounded-lg border border-[var(--kit-danger)]/30 px-2.5 py-1 text-[11px] font-medium text-[var(--kit-danger)] hover:bg-[var(--kit-danger)]/10 transition-colors"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleReactivateClick(u)}
                        className="rounded-lg border border-[var(--kit-success)]/30 px-2.5 py-1 text-[11px] font-medium text-[var(--kit-success)] hover:bg-[var(--kit-success)]/10 transition-colors"
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmOwnerActionModal
        open={modalState.open}
        onClose={() => setModalState((prev) => ({ ...prev, open: false }))}
        title={modalState.title}
        description={modalState.description}
        expectedVerificationText={modalState.expectedVerificationText}
        onConfirm={modalState.action}
      />
    </>
  );
}
