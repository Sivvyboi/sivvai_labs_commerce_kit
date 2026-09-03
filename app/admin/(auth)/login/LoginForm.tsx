"use client";

/**
 * app/admin/(auth)/login/LoginForm.tsx
 *
 * Client Component form for Admin Login.
 * Calls loginAction with email and password.
 */

import React, { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { loginAction, adminGoogleSignInAction, type AuthActionResult } from "@/lib/auth/admin-auth";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/admin";
  const urlMessage = searchParams.get("message");
  const urlError = searchParams.get("error");

  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    loginAction,
    null
  );

  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [googleError, setGoogleError] = React.useState<string | null>(null);

  async function handleGoogleSignIn() {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const res = await adminGoogleSignInAction(redirectTo);
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        setGoogleError(res.error || "Could not initialize Google sign-in.");
        setGoogleLoading(false);
      }
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        {urlMessage && (
          <div className="rounded-lg bg-[var(--kit-success)]/10 p-3 text-xs text-[var(--kit-success)] border border-[var(--kit-success)]/20">
            {urlMessage}
          </div>
        )}

        {(state?.error || urlError) && (
          <div className="rounded-lg bg-[var(--kit-danger)]/10 p-3 text-xs text-[var(--kit-danger)] border border-[var(--kit-danger)]/20">
            {state?.error || urlError}
          </div>
        )}

        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium text-[var(--kit-fg)]"
          >
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="admin@example.com"
            className="mt-1 block w-full rounded-lg border border-[var(--kit-border)] bg-[var(--kit-bg)] px-3 py-2 text-sm text-[var(--kit-fg)] placeholder-[var(--kit-muted-fg)] focus:border-[var(--kit-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kit-primary)]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-[var(--kit-fg)]"
            >
              Password
            </label>
            <Link
              href="/admin/forgot-password"
              className="text-xs text-[var(--kit-primary)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="mt-1 block w-full rounded-lg border border-[var(--kit-border)] bg-[var(--kit-bg)] px-3 py-2 text-sm text-[var(--kit-fg)] placeholder-[var(--kit-muted-fg)] focus:border-[var(--kit-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kit-primary)]"
          />
        </div>

        <div className="flex items-center">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            className="h-4 w-4 rounded border-[var(--kit-border)] bg-[var(--kit-bg)] text-[var(--kit-primary)] focus:ring-[var(--kit-primary)]"
          />
          <label
            htmlFor="remember"
            className="ml-2 block text-xs text-[var(--kit-muted-fg)]"
          >
            Remember me on this device
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending || googleLoading}
          className="w-full rounded-lg bg-[var(--kit-primary)] px-4 py-2.5 text-xs font-medium text-[var(--kit-primary-fg)] transition-colors hover:bg-[var(--kit-primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--kit-primary)] focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Signing in..." : "Sign In with Email"}
        </button>
      </form>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--kit-border)]" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
          <span className="bg-[var(--kit-card)] px-2 text-[var(--kit-muted-fg)] font-medium">
            or continue with
          </span>
        </div>
      </div>

      {googleError && (
        <div className="rounded-lg bg-[var(--kit-danger)]/10 p-2.5 text-xs text-[var(--kit-danger)] border border-[var(--kit-danger)]/20">
          {googleError}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || isPending}
        className="w-full h-10 inline-flex items-center justify-center gap-2.5 rounded-lg border border-[var(--kit-border)] bg-[var(--kit-bg)] hover:bg-[var(--kit-surface)] active:scale-[0.99] text-[var(--kit-fg)] text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--kit-primary)]" />
        ) : (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
        )}
        <span>{googleLoading ? "Connecting to Google…" : "Continue with Google"}</span>
      </button>
    </div>
  );
}
