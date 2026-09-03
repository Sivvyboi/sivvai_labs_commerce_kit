/**
 * services/admin-invitations-service.ts
 *
 * Domain service for Admin Invitation lifecycle and atomic acceptance.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface AcceptAdminInvitationParams {
  token: string;
  authUserId: string;
  email: string;
}

export interface AcceptAdminInvitationResult {
  success: boolean;
  error?: "invitation_invalid" | "invitation_expired" | "invitation_email_mismatch" | "already_active" | "invitation_failed";
  adminId?: string;
  isReactivated?: boolean;
}

/**
 * Handles accepting an admin invitation atomically via transactional PostgreSQL RPC.
 * Correctly creates new admin records or reactivates existing inactive admins,
 * applying the invited role while preserving existing admin ID and overrides,
 * locking the invitation row against concurrent double-consumption.
 */
export async function acceptAdminInvitation(
  params: AcceptAdminInvitationParams
): Promise<AcceptAdminInvitationResult> {
  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await (
      adminSupabase as unknown as {
        rpc: (
          fn: string,
          args: Record<string, unknown>
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      }
    ).rpc("accept_admin_invitation_rpc", {
      p_token: params.token,
      p_auth_user_id: params.authUserId,
      p_email: params.email,
    });

    if (error || !data) {
      console.error("[acceptAdminInvitation] RPC error:", error?.message);
      return { success: false, error: "invitation_failed" };
    }

    const result = data as {
      success: boolean;
      error?: "invitation_invalid" | "invitation_expired" | "invitation_email_mismatch" | "already_active" | "invitation_failed";
      admin_id?: string;
      is_reactivated?: boolean;
    };

    if (!result.success) {
      return { success: false, error: result.error || "invitation_invalid" };
    }

    return {
      success: true,
      adminId: result.admin_id,
      isReactivated: result.is_reactivated,
    };
  } catch (err) {
    console.error("[acceptAdminInvitation] Unexpected error:", err);
    return { success: false, error: "invitation_failed" };
  }
}

export interface ResendAdminInvitationParams {
  invitationId: string;
  callerAdminId?: string;
  callerEmail?: string;
}

export interface ResendAdminInvitationResult {
  success: boolean;
  error?: string;
  existingAuthUser?: boolean;
  email?: string;
  role_id?: string;
  roleName?: string;
  invitation?: {
    id: string;
    email: string;
    role_id: string;
    status: "pending" | "accepted" | "expired" | "revoked";
    token: string;
    expires_at: string;
    created_at: string;
    roles?: { key: string; name: string } | null;
  };
}

/**
 * Resends an existing admin invitation:
 * - Refreshes token with a new cryptographically secure random token (invalidating old token)
 * - Sets a fresh 7-day expiration date
 * - Updates status to 'pending' (restores expired invitations to active pending)
 * - Revokes any other competing pending invitations for the same email
 * - Delivers fresh invitation email via Supabase Auth (Supabase SMTP -> Gmail)
 */
export async function resendAdminInvitation(
  params: ResendAdminInvitationParams
): Promise<ResendAdminInvitationResult> {
  try {
    if (!params.invitationId || typeof params.invitationId !== "string") {
      return { success: false, error: "Invalid invitation ID." };
    }

    const { randomBytes } = await import("crypto");
    const adminSupabase = createAdminClient();

    // 1. Fetch target invitation
    const { data: targetRaw, error: fetchErr } = await adminSupabase
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
        created_at,
        roles (
          key,
          name
        )
      `)
      .eq("id", params.invitationId)
      .single();

    if (fetchErr || !targetRaw) {
      return { success: false, error: "Invitation not found." };
    }

    const target = targetRaw as unknown as {
      id: string;
      email: string;
      role_id: string;
      invited_by: string | null;
      token: string;
      status: "pending" | "accepted" | "expired" | "revoked";
      message: string | null;
      expires_at: string;
      created_at: string;
      roles: { key: string; name: string } | null;
    };

    // 2. Safeguard: Accepted and revoked invitations are historical records and cannot be resent
    if (target.status === "accepted") {
      return { success: false, error: "Cannot resend an already accepted invitation." };
    }
    if (target.status === "revoked") {
      return { success: false, error: "Cannot resend a revoked invitation." };
    }

    // 3. Safeguard: Check if email already has an active administrator account
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
    const authUser = authUsers?.users.find(
      (u) => u.email?.toLowerCase() === target.email.toLowerCase()
    );
    if (authUser) {
      const { data: existingAdmin } = await adminSupabase
        .from("admin_users")
        .select("id, is_active")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

      if (existingAdmin?.is_active) {
        return {
          success: false,
          error: "This email address is already registered as an active administrator.",
        };
      }
    }

    // 4. Cancel any other competing pending invitations for this email
    await adminSupabase
      .from("admin_invitations")
      .update({ status: "revoked" })
      .eq("email", target.email.toLowerCase())
      .neq("id", target.id)
      .eq("status", "pending");

    // 5. Generate a fresh secure random token and 7-day expiration
    const newToken = randomBytes(32).toString("hex");
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const updatePayload: {
      token: string;
      status: "pending";
      expires_at: string;
      invited_by?: string;
    } = {
      token: newToken,
      status: "pending",
      expires_at: newExpiresAt,
      ...(params.callerAdminId ? { invited_by: params.callerAdminId } : {}),
    };

    // 6. Update the invitation record in-place with new token, pending status, and expiration
    const { data: updatedRaw, error: updateErr } = await adminSupabase
      .from("admin_invitations")
      .update(updatePayload)
      .eq("id", target.id)
      .select(`
        id,
        email,
        role_id,
        invited_by,
        token,
        status,
        message,
        expires_at,
        created_at,
        roles (
          key,
          name
        )
      `)
      .single();

    if (updateErr || !updatedRaw) {
      return { success: false, error: updateErr?.message || "Failed to update invitation record." };
    }

    const updated = updatedRaw as unknown as ResendAdminInvitationResult["invitation"];

    // 7. Deliver fresh invitation email via Supabase Auth (Supabase SMTP -> Gmail)
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
      target.email.toLowerCase(),
      {
        redirectTo,
        data: {
          admin_invitation_token: newToken,
          role_id: target.role_id,
        },
      }
    );

    // If recipient is already a registered user in auth.users (Case B), return typed indication
    if (inviteError && inviteError.message?.toLowerCase().includes("already been registered")) {
      const { data: roleData } = await adminSupabase
        .from("roles")
        .select("name")
        .eq("id", target.role_id)
        .single();

      return {
        success: false,
        existingAuthUser: true,
        email: target.email,
        role_id: target.role_id,
        roleName: roleData?.name || "Admin",
        error: "This user already has a registered account. Please directly add them as an administrator.",
      };
    } else if (inviteError) {
      return {
        success: false,
        error: `Failed to deliver invitation email: ${inviteError.message}`,
      };
    }

    return {
      success: true,
      invitation: updated,
    };
  } catch (err) {
    console.error("[resendAdminInvitation] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to resend invitation.",
    };
  }
}

