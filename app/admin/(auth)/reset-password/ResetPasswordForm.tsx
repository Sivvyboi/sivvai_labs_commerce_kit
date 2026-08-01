"use client";

/**
 * app/admin/(auth)/reset-password/ResetPasswordForm.tsx
 *
 * Client Component form for Password Reset.
 */

import React, { useActionState } from "react";
import { resetPasswordAction, type AuthActionResult } from "@/lib/auth/admin-auth";

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    resetPasswordAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-[var(--kit-danger)]/10 p-3 text-xs text-[var(--kit-danger)] border border-[var(--kit-danger)]/20">
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-medium text-[var(--kit-fg)]"
        >
          New Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          className="mt-1 block w-full rounded-lg border border-[var(--kit-border)] bg-[var(--kit-bg)] px-3 py-2 text-sm text-[var(--kit-fg)] placeholder-[var(--kit-muted-fg)] focus:border-[var(--kit-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kit-primary)]"
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-xs font-medium text-[var(--kit-fg)]"
        >
          Confirm New Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          className="mt-1 block w-full rounded-lg border border-[var(--kit-border)] bg-[var(--kit-bg)] px-3 py-2 text-sm text-[var(--kit-fg)] placeholder-[var(--kit-muted-fg)] focus:border-[var(--kit-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kit-primary)]"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-[var(--kit-primary)] px-4 py-2.5 text-xs font-medium text-[var(--kit-primary-fg)] transition-colors hover:bg-[var(--kit-primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--kit-primary)] focus:ring-offset-2 disabled:opacity-50"
      >
        {isPending ? "Updating password..." : "Set New Password"}
      </button>
    </form>
  );
}
