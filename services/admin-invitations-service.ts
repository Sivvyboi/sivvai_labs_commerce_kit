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
