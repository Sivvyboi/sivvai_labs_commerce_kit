/**
 * app/auth/confirm/route.ts
 *
 * Supabase SSR Email Confirmation / OTP Verification Route Handler.
 *
 * Implements the standard server-side confirmation flow for Next.js SSR / PKCE:
 *   Supabase email ({{ .SiteURL }}/auth/confirm?token_hash=...&type=email)
 *       ↓
 *   /auth/confirm?token_hash=...&type=email
 *       ↓
 *   supabase.auth.verifyOtp({ token_hash, type })
 *       ↓
 *   Session cookies established via @supabase/ssr
 *       ↓
 *   Customer profile synchronization (deduplication / guest link)
 *       ↓
 *   Guest cart reconciliation on login
 *       ↓
 *   Redirect to account or intended destination
 */

import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncCustomerOnOAuthLogin } from "@/services/customer-service";
import { mergeCartOnLoginAction } from "@/features/storefront/actions/cart.actions";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") || "/account";

  const isExplicitAdmin = type === "invite" || next.startsWith("/admin");
  const errorRedirect = isExplicitAdmin
    ? `${origin}/admin/login?error=auth_confirmation_failed`
    : `${origin}/auth/sign-in?error=auth_confirmation_failed`;

  if (token_hash && type) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error && (data?.session?.user || data?.user)) {
      const authUser = data.session?.user || data.user;
      const isPasswordReset = type === "recovery" || next.startsWith("/auth/reset-password");

      // --- Admin Invitation Acceptance ---
      if (authUser && isExplicitAdmin) {
        try {
          // 1. Check for application invitation token in searchParams or user_metadata
          let appInvitationToken =
            searchParams.get("token") || authUser.user_metadata?.admin_invitation_token;

          // 2. If not present in params/metadata, lookup active pending invitation for this email
          if (!appInvitationToken && authUser.email) {
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

            appInvitationToken = pendingInv?.token;
          }

          if (appInvitationToken && authUser.email) {
            const { acceptAdminInvitation } = await import("@/services/admin-invitations-service");
            const result = await acceptAdminInvitation({
              token: appInvitationToken,
              authUserId: authUser.id,
              email: authUser.email,
            });

            if (!result.success) {
              logger.warn("[AuthConfirm] Admin invitation acceptance failed", {
                error: result.error,
                email: authUser.email,
              });
              return NextResponse.redirect(
                `${origin}/admin/login?error=${result.error || "invitation_failed"}`
              );
            }

            logger.info("[AuthConfirm] Admin invitation accepted successfully", {
              email: authUser.email,
              adminId: result.adminId,
            });

            return NextResponse.redirect(`${origin}/admin?welcome=1`);
          }
        } catch (inviteErr) {
          logger.error("[AuthConfirm] Error accepting admin invitation", {
            error: inviteErr instanceof Error ? inviteErr.message : String(inviteErr),
          });
          return NextResponse.redirect(`${origin}/admin/login?error=invitation_failed`);
        }
      }

      if (authUser && !isPasswordReset && !isExplicitAdmin) {
        try {
          const customer = await syncCustomerOnOAuthLogin({
            id: authUser.id,
            email: authUser.email,
            user_metadata: authUser.user_metadata,
            phone: authUser.phone,
          });

          if (customer?.id) {
            await mergeCartOnLoginAction(customer.id);
          }
        } catch (err) {
          logger.warn("[AuthConfirm] Non-fatal customer sync or cart merge error", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    } else if (error) {
      logger.warn("[AuthConfirm] OTP verification error", {
        error: error.message,
        code: error.status,
      });
    }
  }

  return NextResponse.redirect(errorRedirect);
}
