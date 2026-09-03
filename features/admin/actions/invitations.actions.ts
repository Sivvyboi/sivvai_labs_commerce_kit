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

    if (error || !invitation) throw new Error(error?.message || "Failed to create invitation record");

    // Send invitation email via Supabase Auth (Supabase SMTP -> Gmail)
    // Supabase will use the "Invite user" template: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/admin
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://sivvai-labs-commerce-kit.vercel.app");
    const redirectTo = `${siteUrl}/auth/confirm?type=invite&next=/admin`;

    const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
      validated.email.toLowerCase(),
      {
        redirectTo,
        data: {
          admin_invitation_token: invitation.token,
          role_id: validated.role_id,
        },
      }
    );

    // If recipient is already a registered user in auth.users (Case B), link the application token in metadata
    if (inviteError && inviteError.message?.toLowerCase().includes("already been registered")) {
      const { data: userList } = await adminSupabase.auth.admin.listUsers();
      const existingUser = userList?.users.find(
        (u) => u.email?.toLowerCase() === validated.email.toLowerCase()
      );
      if (existingUser) {
        await adminSupabase.auth.admin.updateUserById(existingUser.id, {
          user_metadata: {
            ...existingUser.user_metadata,
            admin_invitation_token: invitation.token,
            role_id: validated.role_id,
          },
        });
      }
    } else if (inviteError) {
      // Roll back/revoke invitation if Supabase email delivery failed
      await adminSupabase
        .from("admin_invitations")
        .update({ status: "revoked" })
        .eq("id", invitation.id);
      throw new Error(`Failed to send invitation email: ${inviteError.message}`);
    }

    await logAuditEvent({
      action: "admin_invitation.sent",
      entityType: "admin_invitation",
      entityId: invitation.id,
      metadata: {
        email: validated.email,
        role_id: validated.role_id,
        actor_email: callerCtx.user.email,
      },
    });

    revalidatePath("/admin/team");
    revalidatePath("/admin/team/invitations");
    return { success: true, invitation };
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

import {
  acceptAdminInvitation as acceptInvitationService,
  resendAdminInvitation as resendInvitationService,
  type AcceptAdminInvitationParams,
} from "@/services/admin-invitations-service";

export async function acceptAdminInvitationAction(params: AcceptAdminInvitationParams) {
  return acceptInvitationService(params);
}

/**
 * Resends an existing admin invitation:
 * - Requires manage_users (Owner-only guard)
 * - Refreshes token and expiration date
 * - Restores expired or pending invitation to active pending
 * - Invalidates old token
 * - Dispatches fresh invitation email
 * - Emits admin_invitation.resent audit event without exposing token
 */
export async function resendAdminInvitationAction(invitationId: string) {
  try {
    const callerCtx = await requirePermission("manage_users");

    if (!invitationId || typeof invitationId !== "string") {
      return { success: false, error: "Invalid invitation ID." };
    }

    const result = await resendInvitationService({
      invitationId,
      callerAdminId: callerCtx.admin.id,
      callerEmail: callerCtx.user.email,
    });

    if (!result.success || !result.invitation) {
      return { success: false, error: result.error || "Failed to resend invitation." };
    }

    await logAuditEvent({
      action: "admin_invitation.resent",
      entityType: "admin_invitation",
      entityId: invitationId,
      metadata: {
        email: result.invitation.email,
        role_id: result.invitation.role_id,
        actor_email: callerCtx.user.email,
      },
    });

    revalidatePath("/admin/team");
    revalidatePath("/admin/team/invitations");

    return {
      success: true,
      invitation: result.invitation,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to resend invitation.",
    };
  }
}

