/**
 * components/admin/ui/StatusBadge.tsx
 *
 * Maps entity status strings to colour-coded pill badges.
 * Uses --kit-* semantic tokens — no hardcoded colours.
 *
 * Supports:
 *  - Order statuses: pending, confirmed, processing, shipped, delivered, completed, cancelled, refunded
 *  - Product statuses: draft, published, archived
 *  - Payment statuses: pending, paid, failed, refunded
 *  - Generic: active, inactive
 */

import * as React from "react";
import { clsx } from "clsx";

type Status =
  // Order
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded"
  // Product
  | "draft"
  | "published"
  | "archived"
  // Payment
  | "paid"
  | "failed"
  // Inventory
  | "low_stock"
  | "in_stock"
  | "out_of_stock"
  // Generic
  | "active"
  | "inactive"
  | string;

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  // Orders
  pending:     { label: "Pending",     style: "bg-[var(--kit-warning)]/15 text-[var(--kit-warning)] ring-[var(--kit-warning)]/25" },
  confirmed:   { label: "Confirmed",   style: "bg-[var(--kit-info)]/15 text-[var(--kit-info)] ring-[var(--kit-info)]/25" },
  processing:  { label: "Processing",  style: "bg-[var(--kit-accent)]/15 text-[var(--kit-accent)] ring-[var(--kit-accent)]/25" },
  shipped:     { label: "Shipped",     style: "bg-[var(--kit-info)]/15 text-[var(--kit-info)] ring-[var(--kit-info)]/25" },
  delivered:   { label: "Delivered",   style: "bg-[var(--kit-success)]/15 text-[var(--kit-success)] ring-[var(--kit-success)]/25" },
  completed:   { label: "Completed",   style: "bg-[var(--kit-success)]/15 text-[var(--kit-success)] ring-[var(--kit-success)]/25" },
  cancelled:   { label: "Cancelled",   style: "bg-[var(--kit-danger)]/15 text-[var(--kit-danger)] ring-[var(--kit-danger)]/25" },
  refunded:    { label: "Refunded",    style: "bg-[var(--kit-muted-fg)]/15 text-[var(--kit-muted-fg)] ring-[var(--kit-muted-fg)]/25" },
  // Products
  draft:       { label: "Draft",       style: "bg-[var(--kit-muted)] text-[var(--kit-muted-fg)] ring-[var(--kit-border)]" },
  published:   { label: "Published",   style: "bg-[var(--kit-success)]/15 text-[var(--kit-success)] ring-[var(--kit-success)]/25" },
  archived:    { label: "Archived",    style: "bg-[var(--kit-muted)] text-[var(--kit-muted-fg)] ring-[var(--kit-border)]" },
  // Payment
  paid:        { label: "Paid",        style: "bg-[var(--kit-success)]/15 text-[var(--kit-success)] ring-[var(--kit-success)]/25" },
  failed:      { label: "Failed",      style: "bg-[var(--kit-danger)]/15 text-[var(--kit-danger)] ring-[var(--kit-danger)]/25" },
  // Inventory
  in_stock:    { label: "In Stock",    style: "bg-[var(--kit-success)]/15 text-[var(--kit-success)] ring-[var(--kit-success)]/25" },
  low_stock:   { label: "Low Stock",   style: "bg-[var(--kit-warning)]/15 text-[var(--kit-warning)] ring-[var(--kit-warning)]/25" },
  out_of_stock:{ label: "Out of Stock",style: "bg-[var(--kit-danger)]/15 text-[var(--kit-danger)] ring-[var(--kit-danger)]/25" },
  // Generic
  active:      { label: "Active",      style: "bg-[var(--kit-success)]/15 text-[var(--kit-success)] ring-[var(--kit-success)]/25" },
  inactive:    { label: "Inactive",    style: "bg-[var(--kit-muted)] text-[var(--kit-muted-fg)] ring-[var(--kit-border)]" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " "),
    style: "bg-[var(--kit-muted)] text-[var(--kit-muted-fg)] ring-[var(--kit-border)]",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        config.style,
        className
      )}
    >
      {config.label}
    </span>
  );
}
