"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function OrderLookupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[OrderLookupError]", error);
  }, [error]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex flex-col items-center justify-center gap-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[var(--kit-text-primary)]">
            Order Lookup Failed
          </h2>
          <p className="text-sm text-[var(--kit-muted-fg)] max-w-sm mx-auto">
            Something went wrong while processing your order lookup. Please try again.
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
    </div>
  );
}
