/**
 * app/auth/callback/route.ts
 *
 * Auth Callback Route Handler.
 * Exchanges the PKCE code for a session when a user clicks an email confirmation or password reset link.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/admin";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return user to login with error query param if exchange fails
  return NextResponse.redirect(`${origin}/admin/login?error=auth_callback_failed`);
}
