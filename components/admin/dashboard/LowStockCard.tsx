/**
 * components/admin/dashboard/LowStockCard.tsx
 *
 * Lists variants with low stock on the dashboard overview.
 * Server Component — data passed as props.
 */

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import type { InventoryWithVariant } from "@/lib/db/inventory";

interface LowStockCardProps {
  items: InventoryWithVariant[];
  /** How many items to display before showing "view all" */
  limit?: number;
}

export function LowStockCard({ items, limit = 5 }: LowStockCardProps) {
  const displayed = items.slice(0, limit);
  const hasMore = items.length > limit;

  return (
    <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-[var(--kit-shadow-sm)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--kit-border)] px-5 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-[var(--kit-warning)]" />
          <p className="text-sm font-medium text-[var(--kit-text-primary)]">Low Stock Alerts</p>
        </div>
        <Link
          href="/admin/inventory?lowStock=true"
          className="flex items-center gap-1 text-xs text-[var(--kit-accent)] hover:underline"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {/* Items */}
      {displayed.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-[var(--kit-text-muted)]">
          All items are well-stocked ✓
        </div>
      ) : (
        <ul className="divide-y divide-[var(--kit-border)]">
          {displayed.map((inv) => {
            const available = inv.on_hand_quantity - inv.reserved_quantity;
            const productName = inv.variant?.product?.name ?? "Unknown product";
            const sku = inv.variant?.sku ?? "—";

            return (
              <li key={inv.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--kit-text-primary)]">
                    {productName}
                  </p>
                  <p className="text-xs text-[var(--kit-text-muted)]">SKU: {sku}</p>
                </div>
                <div className="ml-4 flex-shrink-0 text-right">
                  <span
                    className={clsx(
                      "text-sm font-semibold",
                      available === 0
                        ? "text-[var(--kit-danger)]"
                        : "text-[var(--kit-warning)]"
                    )}
                  >
                    {available}
                  </span>
                  <p className="text-[10px] text-[var(--kit-text-muted)]">available</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <div className="border-t border-[var(--kit-border)] px-5 py-3 text-center">
          <Link
            href="/admin/inventory?lowStock=true"
            className="text-xs text-[var(--kit-accent)] hover:underline"
          >
            + {items.length - limit} more items
          </Link>
        </div>
      )}
    </div>
  );
}
