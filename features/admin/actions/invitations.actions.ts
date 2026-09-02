"use server";

/**
 * features/admin/actions/invitations.actions.ts
 *
 * Typed Server Actions for Admin Team Invitation System.
 * All actions require manage_users permission (Owner only).
 */

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { requirePermission } from "@/lib/auth/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/services/authz-service";
import * as notificationService from "@/services/notification-service";
import { z } from "zod";

const SendInvitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  role_id: z.string().uuid("Invalid role"),
  message: z.string().max(500).optional(),
});

export async function sendAdminInvitationAction(input: {
  email: string;
  role_id: string;
  message?: string;
}) {
  try {
    const callerCtx = await requirePermission("manage_users");
    const validated = SendInvitationSchema.parse(input);
    const adminSupabase = createAdminClient();

    // Check if email already has an active admin account
    const { data: existingAdmin } = await adminSupabase
      .from("admin_users")
      .select("id, is_active")
      .eq("auth_user_id",
        // Look up auth user by email
        (await adminSupabase.auth.admin.listUsers()).data?.users.find(
          (u) => u.email?.toLowerCase() === validated.email.toLowerCase()
        )?.id ?? ""
      )
      .maybeSingle();

    if (existingAdmin?.is_active) {
      return { success: false, error: "This email address is already registered as an active administrator." };
    }

    // Cancel any previous pending invitation for this email
    await adminSupabase
      .from("admin_invitations")
      .update({ status: "revoked" })
      .eq("email", validated.email.toLowerCase())
      .eq("status", "pending");

    // Generate secure random invitation token in TypeScript
    const token = randomBytes(32).toString("hex");

    // Create new invitation
    const { data: invitation, error } = await adminSupabase
      .from("admin_invitations")
      .insert({
        email: validated.email.toLowerCase(),
        role_id: validated.role_id,
        invited_by: callerCtx.admin.id,
        token,
        message: validated.message || null,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Fetch role name for branded email template
    const { data: roleData } = await adminSupabase
      .from("roles")
      .select("name, key")
      .eq("id", validated.role_id)
      .maybeSingle();

    const roleName = roleData?.name || "Team Member";

    // 1. Send branded transactional invitation email through notification service
    // (creates notification_logs record, tracks delivery, and enforces idempotency)
    const notification = await notificationService.sendAdminInvitationNotification({
      email: validated.email.toLowerCase(),
      roleName,
      token: invitation.token,
      invitationId: invitation.id,
      message: validated.message,
      inviterEmail: callerCtx.user.email,
    });

    // 2. Also register invitation with Supabase Auth to enable auth credentials/magic link
    const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
      validated.email.toLowerCase(),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=admin_invite&token=${invitation.token}`,
        data: {
          admin_invitation_token: invitation.token,
          role_id: validated.role_id,
        },
      }
    );

    if (inviteError) {
      // If Supabase Auth fails and notification failed, rollback invitation
      if (notification.status === "failed") {
        await adminSupabase
          .from("admin_invitations")
          .update({ status: "revoked" })
          .eq("id", invitation.id);
        throw new Error(`Failed to send invitation: ${inviteError.message}`);
      }
    }

    await logAuditEvent({
      action: "admin_invitation.sent",
      entityType: "admin_invitation",
      entityId: invitation.id,
      metadata: {
        email: validated.email,
        role_id: validated.role_id,
        actor_email: callerCtx.user.email,
        notification_id: notification.id,
      },
    });

    revalidatePath("/admin/team");
    revalidatePath("/admin/team/invitations");
    return { success: true, invitation, notificationId: notification.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send invitation",
    };
  }
}

export async function listAdminInvitationsAction() {
  try {
    await requirePermission("manage_users");
    const adminSupabase = createAdminClient();

    const { data: invitations, error } = await adminSupabase
      .from("admin_invitations")
      .select(`
        id,
        email,
        role_id,
        invited_by,
        token,
        status,
        message,
        expires_at,
        accepted_at,
        created_at,
        roles (
          key,
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return { success: true, invitations: invitations || [] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to list invitations",
    };
  }
}

export async function revokeAdminInvitationAction(invitationId: string) {
  try {
    const callerCtx = await requirePermission("manage_users");
    const adminSupabase = createAdminClient();

    const { data: updated, error } = await adminSupabase
      .from("admin_invitations")
      .update({ status: "revoked" })
      .eq("id", invitationId)
      .eq("status", "pending")
      .select()
      .single();

    if (error || !updated) {
      throw new Error("Invitation not found or already actioned.");
    }

    await logAuditEvent({
      action: "admin_invitation.revoked",
      entityType: "admin_invitation",
      entityId: invitationId,
      metadata: { actor_email: callerCtx.user.email, target_email: updated.email },
    });

    revalidatePath("/admin/team");
    revalidatePath("/admin/team/invitations");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to revoke invitation",
    };
  }
}

/**
 * Handles accepting an admin invitation.
 * Correctly creates new admin records or reactivates existing inactive admins,
 * applying the invited role while preserving existing admin ID and overrides.
 */
export async function acceptAdminInvitation(params: {
  token: string;
  authUserId: string;
  email: string;
}): Promise<{
  success: boolean;
  error?: "invitation_invalid" | "invitation_expired" | "invitation_email_mismatch" | "invitation_failed";
  adminId?: string;
  isReactivated?: boolean;
}> {
  const adminSupabase = createAdminClient();

  // 1. Look up the pending invitation by token
  const { data: invitation, error: invErr } = await adminSupabase
    .from("admin_invitations")
    .select("id, email, role_id, status, expires_at")
    .eq("token", params.token)
    .eq("status", "pending")
    .maybeSingle();

  if (invErr || !invitation) {
    return { success: false, error: "invitation_invalid" };
  }

  // 2. Check expiration
  if (new Date(invitation.expires_at) < new Date()) {
    await adminSupabase
      .from("admin_invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id);
    return { success: false, error: "invitation_expired" };
  }

  // 3. Verify canonical normalized email match
  if (params.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return { success: false, error: "invitation_email_mismatch" };
  }

  // 4. Locate existing admin_users record by auth_user_id
  const { data: existingAdmin, error: fetchErr } = await adminSupabase
    .from("admin_users")
    .select("id, is_active, is_protected_owner, role_id")
    .eq("auth_user_id", params.authUserId)
    .maybeSingle();

  if (fetchErr) {
    return { success: false, error: "invitation_failed" };
  }

  let adminId: string;
  let isReactivated = false;

  if (!existingAdmin) {
    // Case A — New invite: Email has no existing admin_users record
    const { data: newAdmin, error: insertErr } = await adminSupabase
      .from("admin_users")
      .insert({
        auth_user_id: params.authUserId,
        role_id: invitation.role_id,
        is_active: true,
        is_protected_owner: false,
      })
      .select("id")
      .single();

    if (insertErr || !newAdmin) {
      return { success: false, error: "invitation_failed" };
    }
    adminId = newAdmin.id;
  } else {
    // Case B & C — Existing admin record (inactive re-invite or active admin)
    adminId = existingAdmin.id;

    // Safeguard: Never alter or downgrade a protected Owner
    if (!existingAdmin.is_protected_owner) {
      const { error: updateErr } = await adminSupabase
        .from("admin_users")
        .update({
          is_active: true,
          role_id: invitation.role_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAdmin.id);

      if (updateErr) {
        return { success: false, error: "invitation_failed" };
      }
      isReactivated = !existingAdmin.is_active;
    }
  }

  // 5. Consume invitation exactly once
  const { error: acceptErr } = await adminSupabase
    .from("admin_invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invitation.id);

  if (acceptErr) {
    return { success: false, error: "invitation_failed" };
  }

  // 6. Log audit event
  try {
    await adminSupabase.from("audit_logs").insert({
      admin_user_id: adminId,
      action: isReactivated ? "admin_invitation.accepted_reactivated" : "admin_invitation.accepted",
      entity_type: "admin_invitation",
      entity_id: invitation.id,
      metadata: {
        email: invitation.email,
        role_id: invitation.role_id,
        is_reactivated: isReactivated,
      },
    });
  } catch (auditErr) {
    console.warn("[acceptAdminInvitation] Non-fatal audit log failure:", auditErr);
  }

  return { success: true, adminId, isReactivated };
}
