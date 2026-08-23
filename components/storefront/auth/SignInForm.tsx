"use client";

/**
 * components/storefront/auth/SignInForm.tsx
 *
 * Client Component for customer sign-in.
 * Supports email/password authentication, redirect destination (?redirectTo=),
 * loading spinner, error states, and links to registration and password reset.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { signInAction } from "@/features/storefront/actions/account.actions";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { ROUTES } from "@/constants/routes";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Support both ?next= (from account layout guard) and ?redirectTo= (legacy)
  const redirectTo =
    searchParams.get("next") || searchParams.get("redirectTo") || ROUTES.account;

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signInAction({ email, password });
      if (res.success) {
        router.push(redirectTo);
        router.refresh();
      } else {
        setError(res.error || "Invalid email or password. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Social Sign-In (Google & Apple) */}
      <SocialAuthButtons redirectTo={redirectTo} />

      {/* Visual Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--kit-border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--kit-card)] px-2.5 text-[var(--kit-muted-fg)] font-semibold tracking-wider text-[11px]">
            Or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-xs font-medium animate-in fade-in duration-150">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Email Input */}
      <div className="space-y-1.5">
        <label
          htmlFor="signin-email"
          className="block text-xs font-semibold text-[var(--kit-text-secondary)] uppercase tracking-wider"
        >
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
          <input
            id="signin-email"
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

      {/* Password Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="signin-password"
            className="block text-xs font-semibold text-[var(--kit-text-secondary)] uppercase tracking-wider"
          >
            Password
          </label>
          <Link
            href={ROUTES.auth.forgotPassword}
            className="text-xs font-medium text-[var(--kit-accent)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
          <input
            id="signin-password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••"
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

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 shadow-sm"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Signing in…</span>
          </>
        ) : (
          <>
            <span>Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {/* Link to Registration */}
      <div className="pt-3 text-center text-xs text-[var(--kit-muted-fg)] border-t border-[var(--kit-border)]">
        Don&apos;t have an account?{" "}
        <Link
          href={`${ROUTES.auth.signUp}${redirectTo !== ROUTES.account ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
          className="font-semibold text-[var(--kit-accent)] hover:underline"
        >
          Create an account
        </Link>
      </div>
    </form>
  </div>
);
}
