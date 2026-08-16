"use client";

/**
 * components/storefront/auth/ResetPasswordForm.tsx
 *
 * Client Component for setting a new customer password following a recovery link.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, AlertCircle, Eye, EyeOff, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { resetCustomerPasswordAction } from "@/features/storefront/actions/account.actions";
import { ROUTES } from "@/constants/routes";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await resetCustomerPasswordAction({ password, confirmPassword });
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(ROUTES.account);
          router.refresh();
        }, 2000);
      } else {
        setError(res.error || "Failed to update password. Please request a new reset link.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-4 space-y-4 animate-in fade-in duration-200">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[var(--kit-text-primary)]">Password updated</h3>
          <p className="text-xs text-[var(--kit-muted-fg)] leading-relaxed">
            Your password has been changed successfully. Redirecting you to your account…
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-xs font-medium animate-in fade-in duration-150">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-xs text-[var(--kit-muted-fg)] leading-relaxed">
        Please enter and confirm your new account password below.
      </p>

      {/* New Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="reset-password"
          className="block text-xs font-semibold text-[var(--kit-text-secondary)] uppercase tracking-wider"
        >
          New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
          <input
            id="reset-password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full h-11 pl-10 pr-10 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)]/20 focus:border-[var(--kit-accent)] transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--kit-muted-fg)] hover:text-[var(--kit-text-primary)] transition-colors p-1"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="reset-confirm-password"
          className="block text-xs font-semibold text-[var(--kit-text-secondary)] uppercase tracking-wider"
        >
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
          <input
            id="reset-confirm-password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            className="w-full h-11 pl-10 pr-10 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)]/20 focus:border-[var(--kit-accent)] transition-all"
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 shadow-sm"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Updating password…</span>
          </>
        ) : (
          <>
            <span>Save New Password</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {/* Back to Sign In */}
      <div className="pt-3 text-center text-xs text-[var(--kit-muted-fg)] border-t border-[var(--kit-border)]">
        <Link
          href={ROUTES.auth.signIn}
          className="font-semibold text-[var(--kit-text-secondary)] hover:text-[var(--kit-text-primary)] transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    </form>
  );
}
