"use client";

/**
 * components/storefront/auth/SignUpForm.tsx
 *
 * Client Component for customer registration.
 * Collects name, email, phone (optional), and password.
 * Automatically links past guest checkout records and merges active carts.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail, User, Phone, AlertCircle, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { signUpAction } from "@/features/storefront/actions/account.actions";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { ROUTES } from "@/constants/routes";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || ROUTES.account;

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signUpAction({
        firstName,
        lastName,
        email,
        phone: phone || null,
        password,
      });

      if (res.success) {
        if (res.requiresEmailConfirmation) {
          setRequiresConfirmation(true);
        } else {
          router.push(redirectTo);
          router.refresh();
        }
      } else {
        setError(res.error || "Registration failed. Please check your details and try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (requiresConfirmation) {
    return (
      <div className="text-center py-6 space-y-4 animate-in fade-in duration-200">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-[var(--kit-text-primary)]">Check your email</h3>
          <p className="text-xs text-[var(--kit-muted-fg)] leading-relaxed max-w-sm mx-auto">
            We sent a verification link to <strong className="text-[var(--kit-text-primary)]">{email}</strong>.
            Click the link in your email to confirm your account and log in.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href={ROUTES.auth.signIn}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Social Sign-Up (Google & Apple) */}
      <SocialAuthButtons redirectTo={redirectTo} />

      {/* Visual Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--kit-border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--kit-card)] px-2.5 text-[var(--kit-muted-fg)] font-semibold tracking-wider text-[11px]">
            Or register with email
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

      {/* First & Last Name Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="signup-first-name"
            className="block text-xs font-semibold text-[var(--kit-text-secondary)] uppercase tracking-wider"
          >
            First Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
            <input
              id="signup-first-name"
              type="text"
              required
              autoComplete="given-name"
              placeholder="e.g. Amara"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading}
              className="w-full h-11 pl-10 pr-3.5 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)]/20 focus:border-[var(--kit-accent)] transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="signup-last-name"
            className="block text-xs font-semibold text-[var(--kit-text-secondary)] uppercase tracking-wider"
          >
            Last Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
            <input
              id="signup-last-name"
              type="text"
              required
              autoComplete="family-name"
              placeholder="e.g. Okafor"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading}
              className="w-full h-11 pl-10 pr-3.5 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)]/20 focus:border-[var(--kit-accent)] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Email Input */}
      <div className="space-y-1.5">
        <label
          htmlFor="signup-email"
          className="block text-xs font-semibold text-[var(--kit-text-secondary)] uppercase tracking-wider"
        >
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
          <input
            id="signup-email"
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

      {/* Phone Input (Optional) */}
      <div className="space-y-1.5">
        <label
          htmlFor="signup-phone"
          className="block text-xs font-semibold text-[var(--kit-text-secondary)] uppercase tracking-wider"
        >
          Phone Number <span className="text-[var(--kit-muted-fg)] font-normal lowercase">(optional)</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
          <input
            id="signup-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+234 801 234 5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            className="w-full h-11 pl-10 pr-3.5 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)]/20 focus:border-[var(--kit-accent)] transition-all"
          />
        </div>
      </div>

      {/* Password Input */}
      <div className="space-y-1.5">
        <label
          htmlFor="signup-password"
          className="block text-xs font-semibold text-[var(--kit-text-secondary)] uppercase tracking-wider"
        >
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
          <input
            id="signup-password"
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

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 shadow-sm"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Creating account…</span>
          </>
        ) : (
          <>
            <span>Create Account</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {/* Link to Sign In */}
      <div className="pt-3 text-center text-xs text-[var(--kit-muted-fg)] border-t border-[var(--kit-border)]">
        Already have an account?{" "}
        <Link
          href={`${ROUTES.auth.signIn}${redirectTo !== ROUTES.account ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
          className="font-semibold text-[var(--kit-accent)] hover:underline"
        >
          Sign in
        </Link>
      </div>
    </form>
  </div>
);
}
