"use client";

/**
 * app/error.tsx
 *
 * Root error boundary — catches uncaught exceptions in the route tree
 * below the root layout.
 *
 * MUST be a Client Component ("use client") — React error boundaries
 * only work in client-rendered trees.
 *
 * Props (Next.js 16):
 * - `error`          — the thrown Error object (includes `digest` for server errors)
 * - `unstable_retry` — function to re-render the failed segment
 *
 * Reference:
 * → node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md
 */

import { useEffect } from "react";
import { ROUTES } from "@/constants/routes";

interface ErrorPageProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function ErrorPage({ error, unstable_retry }: ErrorPageProps) {
  useEffect(() => {
    // TODO (Step 2): Replace with your error monitoring service.
    // e.g. Sentry.captureException(error)
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="text-5xl">⚠️</span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="max-w-sm text-sm text-[var(--kit-muted-fg)]">
          An unexpected error occurred. If this keeps happening, please contact
          support.
        </p>
        {/* Surface the digest in development only for easier debugging */}
        {process.env.NODE_ENV === "development" && error.digest && (
          <code className="mt-1 rounded bg-[var(--kit-muted)] px-2 py-1 text-xs text-[var(--kit-muted-fg)]">
            digest: {error.digest}
          </code>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={unstable_retry}
          className="rounded-[var(--kit-radius-md)] bg-[var(--kit-primary)] px-5 py-2.5 text-sm font-medium text-[var(--kit-primary-fg)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kit-accent)]"
        >
          Try again
        </button>

        <a
          href={ROUTES.home}
          className="rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kit-accent)]"
        >
          Go home
        </a>
      </div>
    </main>
  );
}
