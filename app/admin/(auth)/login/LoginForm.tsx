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
import { loginAction, type AuthActionResult } from "@/lib/auth/admin-auth";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/admin";
  const urlMessage = searchParams.get("message");
  const urlError = searchParams.get("error");

  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    loginAction,
    null
  );

  return (
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
        disabled={isPending}
        className="w-full rounded-lg bg-[var(--kit-primary)] px-4 py-2.5 text-xs font-medium text-[var(--kit-primary-fg)] transition-colors hover:bg-[var(--kit-primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--kit-primary)] focus:ring-offset-2 disabled:opacity-50"
      >
        {isPending ? "Signing in..." : "Sign In to Admin"}
      </button>
    </form>
  );
}
