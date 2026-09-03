/**
 * app/auth/callback/route.ts
 *
 * Auth Callback Route Handler.
 * Handles:
 *   1. Standard PKCE code exchange (OAuth, password reset, email confirmation)
 *   2. Server-side token_hash OTP verification
 *   3. Admin invitation acceptance — matches token, creates admin_users record
 *   4. Error forwarding from Supabase Auth
 */

import { type EmailOtpType, type User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { acceptAdminInvitation } from "@/services/admin-invitations-service";
import { syncCustomerOnOAuthLogin } from "@/services/customer-service";
import { mergeCartOnLoginAction } from "@/features/storefront/actions/cart.actions";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const invitationToken = searchParams.get("token");
  const next = searchParams.get("next") || "/account";

  // Error handling from Supabase Auth redirects (e.g. otp_expired, access_denied)
  const authError = searchParams.get("error");
  const authErrorCode = searchParams.get("error_code");
  const authErrorDescription = searchParams.get("error_description");

  const isExplicitAdmin = type === "admin_invite" || type === "invite" || next.startsWith("/admin");
  const errorBase = isExplicitAdmin ? `${origin}/admin/login` : `${origin}/auth/sign-in`;

  if (authError || authErrorCode) {
    logger.warn("[AuthCallback] Received auth error from provider/Supabase", {
      error: authError,
      errorCode: authErrorCode,
      description: authErrorDescription,
    });
    const errorUrl = new URL(errorBase);
    errorUrl.searchParams.set("error", authErrorCode || authError || "auth_callback_failed");
    if (authErrorDescription) {
      errorUrl.searchParams.set("error_description", authErrorDescription);
    }
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createClient();
  let authUser: User | null = null;

  // Case A: PKCE code exchange (OAuth, magic link, PKCE signup)
  if (code) {
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !sessionData?.session) {
      logger.warn("[AuthCallback] exchangeCodeForSession failed", { error: error?.message });
      return NextResponse.redirect(`${errorBase}?error=auth_callback_failed`);
    }
    authUser = sessionData.session.user;
  }
  // Case B: OTP token_hash verification
  else if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    });
    if (error || (!data?.session?.user && !data?.user)) {
      logger.warn("[AuthCallback] verifyOtp failed", { error: error?.message });
      return NextResponse.redirect(`${errorBase}?error=auth_confirmation_failed`);
    }
    authUser = data.session?.user || data.user;
  } else {
    return NextResponse.redirect(`${errorBase}?error=auth_callback_failed`);
  }

  // --- Admin Invitation acceptance ---
  const isInviteFlow = type === "admin_invite" || type === "invite" || isExplicitAdmin;
  if (isInviteFlow && authUser && authUser.email) {
    try {
      let tokenToUse =
        invitationToken || authUser.user_metadata?.admin_invitation_token;

      if (!tokenToUse) {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminSupabase = createAdminClient();
        const { data: pendingInv } = await adminSupabase
          .from("admin_invitations")
          .select("token")
          .eq("email", authUser.email.toLowerCase())
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        tokenToUse = pendingInv?.token;
      }

      if (tokenToUse) {
        const result = await acceptAdminInvitation({
          token: tokenToUse,
          authUserId: authUser.id,
          email: authUser.email,
        });

        if (!result.success) {
          return NextResponse.redirect(
            `${origin}/admin/login?error=${result.error || "invitation_failed"}`
          );
        }

        return NextResponse.redirect(`${origin}/admin?welcome=1`);
      }
    } catch {
      return NextResponse.redirect(`${origin}/admin/login?error=invitation_failed`);
    }
  }

  // --- Customer Authentication (OAuth, Email Confirmation, Sign-In) ---
  const isPasswordReset = next.startsWith("/auth/reset-password") || type === "recovery";

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
