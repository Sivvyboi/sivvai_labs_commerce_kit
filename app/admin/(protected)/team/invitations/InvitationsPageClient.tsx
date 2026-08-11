"use client";

/**
 * app/admin/(protected)/team/invitations/InvitationsPageClient.tsx
 *
 * Client wrapper for the invitations page — handles Invite User modal state.
 */

import * as React from "react";
import { InviteUserModal } from "@/components/admin/team/InviteUserModal";
import { InvitationsTable } from "@/components/admin/team/InvitationsTable";
import { MailPlus } from "lucide-react";

interface Role { id: string; key: string; name: string; }
interface Invitation {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  roles?: { key: string; name: string } | null;
}

interface Props {
  invitations: Invitation[];
  roles: Role[];
}

export function InvitationsPageClient({ invitations, roles }: Props) {
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <>
      <InviteUserModal open={modalOpen} onClose={() => setModalOpen(false)} roles={roles} />
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--kit-accent)]/90 transition-colors"
        >
          <MailPlus size={13} />
          Invite User
        </button>
      </div>
      <InvitationsTable invitations={invitations} />
    </>
  );
}
