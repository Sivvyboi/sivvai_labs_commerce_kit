/**
 * app/(admin)/inventory/page.tsx
 *
 * Admin Inventory Page — Server Component.
 * Supports filtering by low stock (?lowStock=true).
 */

import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { clsx } from "clsx";

import { getInventoryWithVariants, getLowStockItems } from "@/services/inventory-service";
import { InventoryTable } from "@/components/admin/tables/InventoryTable";

export const metadata: Metadata = {
  title: "Inventory",
};

interface AdminInventoryPageProps {
  searchParams: Promise<{
    lowStock?: string;
  }>;
}

export default async function AdminInventoryPage({ searchParams }: AdminInventoryPageProps) {
  const params = await searchParams;
  const filterLowStock = params.lowStock === "true";

  const items = filterLowStock
    ? await getLowStockItems(5)
    : await getInventoryWithVariants();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--kit-text-primary)]">Inventory Management</h1>
          <p className="mt-0.5 text-sm text-[var(--kit-text-secondary)]">
            Track and adjust stock levels ({items.length} records)
          </p>
        </div>

        {/* Low Stock Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] p-1">
          <Link
            href="/admin/inventory"
            className={clsx(
              "rounded-[var(--kit-radius-sm)] px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
              !filterLowStock
                ? "bg-[var(--kit-card)] text-[var(--kit-text-primary)] shadow-[var(--kit-shadow-sm)]"
                : "text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)]"
            )}
          >
            All Inventory
          </Link>
          <Link
            href="/admin/inventory?lowStock=true"
            className={clsx(
              "rounded-[var(--kit-radius-sm)] px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
              filterLowStock
                ? "bg-[var(--kit-card)] text-[var(--kit-warning)] shadow-[var(--kit-shadow-sm)]"
                : "text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)]"
            )}
          >
            Low Stock Only (≤ 5)
          </Link>
        </div>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="rounded-[var(--kit-radius-lg)] border border-dashed border-[var(--kit-border)] bg-[var(--kit-surface)] p-12 text-center text-sm text-[var(--kit-text-muted)]">
          {filterLowStock ? "No items with low stock!" : "No inventory records found."}
        </div>
      ) : (
        <InventoryTable items={items} />
      )}
    </div>
  );
}
