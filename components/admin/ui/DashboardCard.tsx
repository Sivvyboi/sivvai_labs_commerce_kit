/**
 * components/admin/ui/DashboardCard.tsx
 *
 * Metric card for the admin dashboard overview.
 * Displays an icon, label, value, and optional trend indicator.
 * Server Component — no interactivity needed.
 */

import * as React from "react";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;      // e.g. 12 for +12%
    label: string;      // e.g. "vs last month"
    positive?: boolean; // if undefined, infers from value sign
  };
  accent?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const ACCENT_MAP = {
  default: "text-[var(--kit-accent)] bg-[var(--kit-accent)]/10",
  success:  "text-[var(--kit-success)] bg-[var(--kit-success)]/10",
  warning:  "text-[var(--kit-warning)] bg-[var(--kit-warning)]/10",
  danger:   "text-[var(--kit-danger)] bg-[var(--kit-danger)]/10",
  info:     "text-[var(--kit-info)] bg-[var(--kit-info)]/10",
};

export function DashboardCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  accent = "default",
  className,
}: DashboardCardProps) {
  const isPositive = trend ? (trend.positive !== undefined ? trend.positive : trend.value >= 0) : null;

  return (
    <div
      className={clsx(
        "relative rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)]",
        "bg-[var(--kit-card)] p-5 shadow-[var(--kit-shadow-sm)]",
        "flex flex-col gap-4",
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-[var(--kit-text-secondary)]">{title}</p>
        <span className={clsx("flex h-9 w-9 items-center justify-center rounded-[var(--kit-radius-md)]", ACCENT_MAP[accent])}>
          <Icon size={18} aria-hidden />
        </span>
      </div>

      {/* Value */}
      <div>
        <p className="text-2xl font-bold tracking-tight text-[var(--kit-text-primary)]">{value}</p>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--kit-text-muted)]">{description}</p>
        )}
      </div>

      {/* Trend */}
      {trend && (
        <p className="flex items-center gap-1 text-xs">
          <span
            className={clsx(
              "font-semibold",
              isPositive ? "text-[var(--kit-success)]" : "text-[var(--kit-danger)]"
            )}
          >
            {isPositive ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-[var(--kit-text-muted)]">{trend.label}</span>
        </p>
      )}
    </div>
  );
}
