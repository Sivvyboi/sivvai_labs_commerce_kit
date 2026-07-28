"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AccountError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center py-16 px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-[var(--kit-text-primary)]">
          Account Error
        </h2>
        <p className="text-sm text-[var(--kit-muted-fg)] max-w-sm mx-auto">
          Something went wrong while loading your account. Please try again.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--kit-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[44px]"
      >
        <RefreshCw className="h-4 w-4" />
        <span>Try Again</span>
      </button>
    </div>
  );
}
