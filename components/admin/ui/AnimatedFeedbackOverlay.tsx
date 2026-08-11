"use client";

/**
 * components/admin/ui/AnimatedFeedbackOverlay.tsx
 *
 * Full-screen animated feedback overlay component for admin mutations.
 * Supports 'loading', 'success', and 'error' states with smooth keyframe animations,
 * backdrop blur, animated SVG badges, and auto-dismiss / retry triggers.
 */

import * as React from "react";
import { Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react";

export type FeedbackStatus = "idle" | "loading" | "success" | "error";

export interface AnimatedFeedbackOverlayProps {
  status: FeedbackStatus;
  title?: string;
  message?: string;
  errorDetails?: string | null;
  autoDismissMs?: number;
  onClose?: () => void;
  onRetry?: () => void;
}

export function AnimatedFeedbackOverlay({
  status,
  title,
  message,
  errorDetails,
  autoDismissMs = 1800,
  onClose,
  onRetry,
}: AnimatedFeedbackOverlayProps) {
  React.useEffect(() => {
    if (status === "success" && onClose && autoDismissMs > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [status, onClose, autoDismissMs]);

  if (status === "idle") return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-300 animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
        {/* Close Button (error state only) */}
        {status === "error" && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close message"
            className="absolute top-4 right-4 text-[var(--kit-muted-fg)] hover:text-[var(--kit-text-primary)] transition-colors p-1 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Animated Icon Indicator */}
        <div className="flex justify-center">
          {status === "loading" && (
            <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-[var(--kit-accent)]/10 border border-[var(--kit-accent)]/30">
              <Loader2 className="h-10 w-10 text-[var(--kit-accent)] animate-spin" />
            </div>
          )}

          {status === "success" && (
            <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 animate-in zoom-in duration-300">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-bounce" />
            </div>
          )}

          {status === "error" && (
            <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-rose-500/10 border border-rose-500/30 animate-in zoom-in duration-300">
              <AlertTriangle className="h-12 w-12 text-rose-500" />
            </div>
          )}
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-[var(--kit-text-primary)]">
            {title ??
              (status === "loading"
                ? "Processing Request…"
                : status === "success"
                ? "Action Completed Successfully!"
                : "Action Failed")}
          </h3>

          {message && (
            <p className="text-xs sm:text-sm text-[var(--kit-text-secondary)]">
              {message}
            </p>
          )}

          {status === "error" && errorDetails && (
            <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400 font-mono text-left max-h-32 overflow-y-auto">
              {errorDetails}
            </div>
          )}
        </div>

        {/* Actions for Error State */}
        {status === "error" && (
          <div className="flex gap-3 pt-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-surface)] text-xs font-semibold text-[var(--kit-text-primary)] hover:bg-[var(--kit-muted)] transition-colors"
              >
                Dismiss
              </button>
            )}

            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex-1 h-10 rounded-xl bg-[var(--kit-accent)] text-xs font-semibold text-white hover:opacity-90 transition-opacity shadow-sm"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
