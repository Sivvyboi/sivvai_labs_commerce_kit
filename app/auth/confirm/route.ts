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
