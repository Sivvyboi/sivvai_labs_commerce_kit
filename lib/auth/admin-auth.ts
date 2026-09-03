"use server";

/**
 * lib/auth/admin-auth.ts
 *
 * Auth Server Actions for Admin Authentication:
 * - loginAction: Handles email/password login
 * - logoutAction: Handles sign-out and session destruction
 * - requestPasswordResetAction: Sends password reset email
 * - resetPasswordAction: Updates user password
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

export async function loginAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/admin";

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  redirect(redirectTo);
}

export async function logoutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function requestPasswordResetAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;

  if (!email) {
    return { success: false, error: "Email is required." };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/admin/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
  };
}

export async function resetPasswordAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return { success: false, error: "Both password fields are required." };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  redirect("/admin/login?message=Password updated successfully");
}

/**
 * Initializes Google OAuth sign-in for the Admin Console.
 * Redirects through /auth/callback?next=/admin.
 * Does not bypass admin guards: users without an active admin_users record
 * will be blocked at the admin layout boundary and redirected to /admin/login?error=unauthorized.
 */
export async function adminGoogleSignInAction(redirectTo: string = "/admin") {
  try {
    const supabase = await createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://sivvai-labs-commerce-kit.vercel.app");
    const nextPath = redirectTo.startsWith("/admin") ? redirectTo : "/admin";
    const callbackUrl = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (error || !data?.url) {
      return {
        success: false,
        error: error?.message || "Failed to initialize Google sign-in.",
      };
    }

    return {
      success: true,
      url: data.url,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to initialize Google sign-in.",
    };
  }
}
