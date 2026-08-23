"use client";

/**
 * components/storefront/auth/SocialAuthButtons.tsx
 *
 * Client Component rendering Google OAuth button.
 * Supports loading states, error handling, redirect destinations,
 * and conforms to Sivvai Labs Commerce Kit design aesthetics.
 */

import * as React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { signInWithOAuthAction } from "@/features/storefront/actions/account.actions";
import { ROUTES } from "@/constants/routes";

interface SocialAuthButtonsProps {
  redirectTo?: string;
  className?: string;
}

export function SocialAuthButtons({
  redirectTo = ROUTES.account,
  className = "",
}: SocialAuthButtonsProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);

    try {
      const res = await signInWithOAuthAction({
        provider: "google",
        redirectTo,
      });

      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        setError(res.error || "Could not initialize Google sign-in.");
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setLoading(false);
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-xs font-medium animate-in fade-in duration-150">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Google Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        aria-label="Continue with Google"
        className="w-full h-11 px-4 inline-flex items-center justify-center gap-2.5 rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] hover:bg-[var(--kit-surface)] active:scale-[0.99] text-[var(--kit-text-primary)] text-xs font-semibold shadow-sm transition-all disabled:opacity-50 min-h-[44px]"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--kit-accent)]" />
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
        <span>{loading ? "Connecting to Google…" : "Continue with Google"}</span>
      </button>
    </div>
  );
}
