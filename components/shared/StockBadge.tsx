/**
 * components/shared/StockBadge.tsx
 *
 * Reusable stock/inventory availability badge.
 * Displays In Stock, Low Stock, or Out of Stock states.
 * Wraps the existing UI Badge primitive.
 */

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

export interface StockBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Numeric stock quantity available */
  quantity?: number;
  /** Quantity threshold below which the item is considered "Low Stock". Defaults to 5 */
  threshold?: number;
  /** Display variant: "default" (standard badge), "sm" (compact), or "dot" (indicator dot + text) */
  variant?: "default" | "sm" | "dot";
}

export function StockBadge({
  quantity,
  threshold = 5,
  variant = "default",
  className,
  ...props
}: StockBadgeProps) {
  const isOutOfStock = quantity !== undefined && quantity <= 0;
  const isLowStock =
    quantity !== undefined && quantity > 0 && quantity <= threshold;

  let label = "In Stock";
  let badgeColorClass =
    "border-transparent bg-[var(--kit-success)]/10 text-[var(--kit-success)] border-[var(--kit-success)]/20 font-semibold";
  let dotColorClass = "bg-[var(--kit-success)]";

  if (isOutOfStock) {
    label = "Out of Stock";
    badgeColorClass =
      "border-transparent bg-[var(--kit-danger)]/10 text-[var(--kit-danger)] border-[var(--kit-danger)]/20 font-semibold";
    dotColorClass = "bg-[var(--kit-danger)]";
  } else if (isLowStock) {
    label = `Only ${quantity} Left`;
    badgeColorClass =
      "border-transparent bg-[var(--kit-warning)]/10 text-[var(--kit-warning)] border-[var(--kit-warning)]/20 font-semibold";
    dotColorClass = "bg-[var(--kit-warning)]";
  }

  if (variant === "dot") {
    return (
      <div
        className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}
        {...props}
      >
        <span className={cn("h-2 w-2 rounded-full shrink-0", dotColorClass)} />
        <span>{label}</span>
      </div>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        badgeColorClass,
        variant === "sm" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs",
        className
      )}
      {...props}
    >
      {label}
    </Badge>
  );
}
