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
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://sivvai-labs-commerce-kit.vercel.app");
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

    // If recipient is already a registered user in auth.users (Case B), prompt Owner to directly add them
    if (inviteError && inviteError.message?.toLowerCase().includes("already been registered")) {
      // Remove temporary invitation record to prevent orphaned pending invite
      await adminSupabase.from("admin_invitations").delete().eq("id", invitation.id);

      const { data: roleData } = await adminSupabase
        .from("roles")
        .select("name")
        .eq("id", validated.role_id)
        .single();

      return {
        success: false,
        existingAuthUser: true,
        email: validated.email.toLowerCase(),
        role_id: validated.role_id,
        roleName: roleData?.name || "Admin",
        error: "user_already_registered",
      };
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
    return { success: true, deliveryMode: "sent" as const, invitation };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send invitation",
    };
  }
}

/**
 * Directly promotes an existing registered Supabase Auth user to an admin role.
 * - Requires manage_users (Owner only)
 * - Safe: Never touches customer cart/order/address data
 * - Creates admin_users record (or reactivates existing)
 * - Inserts accepted admin_invitations record for audit trail
 * - Sets user_metadata.sivvai_admin_notification to trigger storefront banner on next visit
 * - Logs admin_user.direct_promoted audit event
 */
export async function directPromoteAdminAction(input: {
  email: string;
  role_id: string;
}) {
  try {
    const callerCtx = await requirePermission("manage_users");
    const validated = z
      .object({
        email: z.string().email(),
        role_id: z.string().uuid(),
      })
      .parse(input);

    const adminSupabase = createAdminClient();

    // 1. Fetch role
    const { data: role, error: roleErr } = await adminSupabase
      .from("roles")
      .select("id, key, name")
      .eq("id", validated.role_id)
      .single();

    if (roleErr || !role) {
      return { success: false, error: "Invalid role selected." };
    }

    // 2. Find target user in auth.users
    const { data: userList, error: listErr } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) {
      return { success: false, error: "Failed to query user accounts." };
    }

    const targetUser = userList.users.find(
      (u) => u.email?.toLowerCase() === validated.email.toLowerCase()
    );

    if (!targetUser) {
      return { success: false, error: "No registered user account found with this email." };
    }

    // 3. Check if already active admin
    const { data: existingAdmin } = await adminSupabase
      .from("admin_users")
      .select("id, is_active, role_id")
      .eq("auth_user_id", targetUser.id)
      .maybeSingle();

    if (existingAdmin?.is_active) {
      return { success: false, error: "This user is already an active administrator." };
    }

    // 4. Create or update admin_users row
    if (existingAdmin) {
      await adminSupabase
        .from("admin_users")
        .update({
          role_id: role.id,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAdmin.id);
    } else {
      const { error: insertAdminErr } = await adminSupabase
        .from("admin_users")
        .insert({
          auth_user_id: targetUser.id,
          role_id: role.id,
          is_active: true,
          is_protected_owner: false,
        });
      if (insertAdminErr) {
        throw new Error(`Failed to assign admin role: ${insertAdminErr.message}`);
      }
    }

    // 5. Clean up any pending invitations for this email and record acceptance
    await adminSupabase
      .from("admin_invitations")
      .update({ status: "revoked" })
      .eq("email", validated.email.toLowerCase())
      .eq("status", "pending");

    const token = randomBytes(32).toString("hex");
    await adminSupabase
      .from("admin_invitations")
      .insert({
        email: validated.email.toLowerCase(),
        role_id: role.id,
        invited_by: callerCtx.admin.id,
        token,
        status: "accepted",
        accepted_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        message: "Directly added as admin by Owner",
      });

    // 6. Set user_metadata notification flag for storefront popup
    await adminSupabase.auth.admin.updateUserById(targetUser.id, {
      user_metadata: {
        ...targetUser.user_metadata,
        sivvai_admin_notification: {
          role: role.name,
          promoted_at: new Date().toISOString(),
        },
      },
    });

    // 7. Audit log
    await logAuditEvent({
      action: "admin_user.direct_promoted",
      entityType: "admin_user",
      entityId: targetUser.id,
      metadata: {
        email: targetUser.email,
        role_id: role.id,
        role_name: role.name,
        actor_email: callerCtx.user.email,
      },
    });

    revalidatePath("/admin/team");
    revalidatePath("/admin/team/members");
    revalidatePath("/admin/team/invitations");

    return {
      success: true,
      deliveryMode: "direct_promote" as const,
      roleName: role.name,
      email: validated.email.toLowerCase(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to directly add admin user.",
    };
  }
}

/**
 * Clears the storefront admin promotion notification banner flag from the caller's own user_metadata.
 */
export async function clearAdminPromotionNotificationAction() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return { success: false, error: "Not authenticated" };

    const adminSupabase = createAdminClient();
    await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata || {}),
        sivvai_admin_notification: null,
      },
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to clear notification",
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
      return {
        success: false,
        error: result.error || "Failed to resend invitation.",
        existingAuthUser: result.existingAuthUser,
        email: result.email,
        role_id: result.role_id,
        roleName: result.roleName,
      };
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

