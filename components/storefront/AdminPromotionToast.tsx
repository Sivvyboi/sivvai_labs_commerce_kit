"use client";

/**
 * components/storefront/AdminPromotionToast.tsx
 *
 * Storefront notification popup displayed when an existing user is promoted to the admin team.
 * Provides a direct link to the Admin Console and clears the notification flag on dismiss/navigate.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, X, Sparkles } from "lucide-react";
import { clearAdminPromotionNotificationAction } from "@/features/admin/actions/invitations.actions";

interface AdminPromotionToastProps {
  roleName: string;
  promotedAt?: string;
}

export function AdminPromotionToast({ roleName, promotedAt }: AdminPromotionToastProps) {
  const router = useRouter();
  const storageKey = `sivvai_dismissed_admin_${roleName}_${promotedAt || "default"}`;
  const [visible, setVisible] = React.useState(true);
  const [dismissing, setDismissing] = React.useState(false);

  const isDismissedInSession = React.useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return sessionStorage.getItem(storageKey) === "1";
      } catch {
        return false;
      }
    },
    () => false
  );

  async function handleDismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // Ignore storage errors
    }
    try {
      await clearAdminPromotionNotificationAction();
      router.refresh();
    } catch {
      // Non-fatal
    }
  }

  async function handleVisitDashboard() {
    setDismissing(true);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // Ignore storage errors
    }
    try {
      await clearAdminPromotionNotificationAction();
    } catch {
      // Non-fatal
    }
    router.push("/admin");
  }

  if (!visible || isDismissedInSession) return null;

  return (
    <aside
      aria-label="Admin Access Notification"
      className="fixed bottom-6 right-6 z-50 max-w-md w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[var(--kit-accent)]/30 bg-[var(--kit-card)]/95 p-5 shadow-2xl backdrop-blur-md dark:bg-zinc-900/95 transition-all">
        {/* Decorative background glow */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[var(--kit-accent)]/15 blur-2xl" />

        <div className="relative flex items-start gap-3.5">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] border border-[var(--kit-accent)]/20">
            <ShieldCheck className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--kit-accent)]">
                <Sparkles className="h-3 w-3" /> Admin Access
              </span>
            </div>
            <h3 className="mt-1 text-sm font-semibold text-[var(--kit-text-primary)]">
              You&apos;ve been added as an admin!
            </h3>
            <p className="mt-1 text-xs text-[var(--kit-text-muted)] leading-relaxed">
              Your account now has administrative privileges as{" "}
              <strong className="text-[var(--kit-text-primary)] font-semibold">{roleName}</strong>.
            </p>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleVisitDashboard}
                disabled={dismissing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--kit-accent)] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[var(--kit-accent)]/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <span>Visit Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--kit-text-muted)] hover:bg-[var(--kit-surface)] hover:text-[var(--kit-text-primary)] transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Close X */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss notification"
            className="absolute top-0 right-0 p-1 text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)] transition-colors rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
