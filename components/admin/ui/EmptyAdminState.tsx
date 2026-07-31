/**
 * components/admin/ui/EmptyAdminState.tsx
 *
 * Empty state displayed when an admin list has no results.
 * Server Component — no interactivity required in this component itself.
 */

import * as React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { PackageSearch } from "lucide-react";

interface EmptyAdminStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function EmptyAdminState({
  icon: Icon = PackageSearch,
  title,
  description,
  action,
  className,
}: EmptyAdminStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-4 rounded-[var(--kit-radius-lg)]",
        "border border-dashed border-[var(--kit-border)] bg-[var(--kit-surface)]",
        "px-6 py-16 text-center",
        className
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--kit-muted)] text-[var(--kit-text-muted)]">
        <Icon size={26} aria-hidden />
      </span>

      <div>
        <p className="text-sm font-semibold text-[var(--kit-text-primary)]">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-[var(--kit-text-secondary)]">{description}</p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className={clsx(
            "inline-flex h-9 items-center gap-2 rounded-[var(--kit-radius-md)] px-4 text-sm font-medium",
            "bg-[var(--kit-accent)] text-white hover:opacity-90 transition-opacity"
          )}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
