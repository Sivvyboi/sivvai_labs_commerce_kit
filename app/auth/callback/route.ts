/**
 * app/auth/callback/route.ts
 *
 * Auth Callback Route Handler.
 * Handles:
 *   1. Standard PKCE code exchange (password reset, email confirmation)
 *   2. Admin invitation acceptance — matches token, creates admin_users record
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncCustomerOnOAuthLogin } from "@/services/customer-service";
import { mergeCartOnLoginAction } from "@/features/storefront/actions/cart.actions";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const invitationToken = searchParams.get("token");
  const next = searchParams.get("next") || "/account";

  const isExplicitAdmin = type === "admin_invite" || next.startsWith("/admin");
  const errorRedirect = isExplicitAdmin
    ? `${origin}/admin/login?error=auth_callback_failed`
    : `${origin}/auth/sign-in?error=auth_callback_failed`;

  if (!code) {
    return NextResponse.redirect(errorRedirect);
  }

  const supabase = await createClient();
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !sessionData?.session) {
    return NextResponse.redirect(errorRedirect);
  }

  // --- Admin Invitation acceptance ---
  if (type === "admin_invite" && invitationToken) {
    try {
      const adminSupabase = createAdminClient();
      const user = sessionData.session.user;

      // Look up the invitation
      const { data: invitation, error: invErr } = await adminSupabase
        .from("admin_invitations")
        .select("id, email, role_id, status, expires_at")
        .eq("token", invitationToken)
        .eq("status", "pending")
        .single();

      if (invErr || !invitation) {
        // Invitation not found or already used — still let the user log in but
        // redirect to an error page
        return NextResponse.redirect(`${origin}/admin/login?error=invitation_invalid`);
      }

      // Check expiry
      if (new Date(invitation.expires_at) < new Date()) {
        await adminSupabase
          .from("admin_invitations")
          .update({ status: "expired" })
          .eq("id", invitation.id);
        return NextResponse.redirect(`${origin}/admin/login?error=invitation_expired`);
      }

      // Verify email matches
      if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        return NextResponse.redirect(`${origin}/admin/login?error=invitation_email_mismatch`);
      }

      // Check if admin_users record already exists
      const { data: existingAdmin } = await adminSupabase
        .from("admin_users")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!existingAdmin) {
        // Create admin_users record
        await adminSupabase.from("admin_users").insert({
          auth_user_id: user.id,
          role_id: invitation.role_id,
          is_active: true,
          is_protected_owner: false,
        });
      }

      // Mark invitation as accepted
      await adminSupabase
        .from("admin_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);

      return NextResponse.redirect(`${origin}/admin?welcome=1`);
    } catch {
      return NextResponse.redirect(`${origin}/admin/login?error=invitation_failed`);
    }
  }

  // --- Customer Authentication (OAuth, Email Confirmation, Sign-In) ---
  const authUser = sessionData.session.user;
  const isPasswordReset = next.startsWith("/auth/reset-password");

  if (authUser && !isPasswordReset && !isExplicitAdmin) {
    try {
      const customer = await syncCustomerOnOAuthLogin({
        id: authUser.id,
        email: authUser.email,
        user_metadata: authUser.user_metadata,
        phone: authUser.phone,
      });

      if (customer?.id) {
        // Reconcile active guest cart with authenticated customer cart
        await mergeCartOnLoginAction(customer.id);
      }
    } catch (err) {
      logger.warn("[AuthCallback] Non-fatal error synchronizing customer profile or merging cart", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // --- Standard redirection ---
  return NextResponse.redirect(`${origin}${next}`);
}
