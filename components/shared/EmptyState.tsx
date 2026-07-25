/**
 * components/shared/EmptyState.tsx
 *
 * Generic empty state component for empty search results, empty cart, 404s, etc.
 */

import * as React from "react";
import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional custom icon. Defaults to PackageOpen */
  icon?: React.ReactNode;
  /** Primary heading string */
  title: string;
  /** Optional descriptive subtitle */
  description?: string;
  /** Optional primary action button or link */
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 my-6 rounded-xl border border-dashed border-[var(--kit-border)] bg-[var(--kit-surface)]/50 space-y-4",
        className
      )}
      {...props}
    >
      {/* Icon Circle */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kit-card)] border border-[var(--kit-border)] text-[var(--kit-muted-fg)] shadow-sm shrink-0">
        {icon ?? <PackageOpen className="h-8 w-8 text-[var(--kit-accent)]" />}
      </div>

      {/* Heading & Description */}
      <div className="space-y-1 max-w-sm">
        <h3 className="text-base sm:text-lg font-bold text-[var(--kit-text-primary)]">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-[var(--kit-muted-fg)] leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Action Button / Link */}
      {action && (
        <div className="pt-2">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center justify-center rounded-lg bg-[var(--kit-accent)] px-5 py-2.5 text-xs font-semibold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[44px] shadow-sm"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center justify-center rounded-lg bg-[var(--kit-accent)] px-5 py-2.5 text-xs font-semibold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[44px] shadow-sm"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
