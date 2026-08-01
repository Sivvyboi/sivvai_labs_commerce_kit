"use client";

/**
 * app/admin/(auth)/forgot-password/ForgotPasswordForm.tsx
 *
 * Client Component form for Password Reset Request.
 */

import React, { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type AuthActionResult } from "@/lib/auth/admin-auth";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    requestPasswordResetAction,
    null
  );

  if (state?.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-[var(--kit-success)]/10 p-4 text-xs text-[var(--kit-success)] border border-[var(--kit-success)]/20">
          Check your email for a link to reset your password.
        </div>
        <Link
          href="/admin/login"
          className="inline-block text-xs font-medium text-[var(--kit-primary)] hover:underline"
        >
          Return to login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-[var(--kit-danger)]/10 p-3 text-xs text-[var(--kit-danger)] border border-[var(--kit-danger)]/20">
          {state.error}
        </div>
      )}

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

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-[var(--kit-primary)] px-4 py-2.5 text-xs font-medium text-[var(--kit-primary-fg)] transition-colors hover:bg-[var(--kit-primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--kit-primary)] focus:ring-offset-2 disabled:opacity-50"
      >
        {isPending ? "Sending reset link..." : "Send Reset Link"}
      </button>

      <div className="text-center">
        <Link
          href="/admin/login"
          className="text-xs text-[var(--kit-muted-fg)] hover:text-[var(--kit-fg)] transition-colors"
        >
          Back to login
        </Link>
      </div>
    </form>
  );
}
