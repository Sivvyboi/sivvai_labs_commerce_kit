"use client";

/**
 * components/storefront/auth/ForgotPasswordForm.tsx
 *
 * Client Component for requesting customer password reset email.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Mail, AlertCircle, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { requestCustomerPasswordResetAction } from "@/features/storefront/actions/account.actions";
import { ROUTES } from "@/constants/routes";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await requestCustomerPasswordResetAction({ email });
      if (res.success) {
        setSubmitted(true);
      } else {
        setError(res.error || "Failed to process password reset request.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-4 space-y-4 animate-in fade-in duration-200">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[var(--kit-text-primary)]">Password reset link sent</h3>
          <p className="text-xs text-[var(--kit-muted-fg)] leading-relaxed max-w-sm mx-auto">
            If an account exists for <strong className="text-[var(--kit-text-primary)]">{email}</strong>,
            you will receive an email with instructions to reset your password.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href={ROUTES.auth.signIn}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Sign In</span>
          </Link>
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
        Enter your registered email address and we&apos;ll send you a link to reset your password.
      </p>

      {/* Email Input */}
      <div className="space-y-1.5">
        <label
          htmlFor="forgot-email"
          className="block text-xs font-semibold text-[var(--kit-text-secondary)] uppercase tracking-wider"
        >
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
          <input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full h-11 pl-10 pr-3.5 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)]/20 focus:border-[var(--kit-accent)] transition-all"
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
            <span>Sending link…</span>
          </>
        ) : (
          <>
            <span>Send Reset Link</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {/* Back to Sign In Link */}
      <div className="pt-3 text-center text-xs text-[var(--kit-muted-fg)] border-t border-[var(--kit-border)]">
        <Link
          href={ROUTES.auth.signIn}
          className="inline-flex items-center gap-1 font-semibold text-[var(--kit-text-secondary)] hover:text-[var(--kit-text-primary)] transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </form>
  );
}
