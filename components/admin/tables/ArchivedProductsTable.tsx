"use client";

/**
 * components/admin/tables/ArchivedProductsTable.tsx
 *
 * Archived products table for /admin/products/archived.
 * Supports multi-select, bulk catalog deletion, individual deletion, and restoration.
 */

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, RotateCcw, Package, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { Price } from "@/components/shared/Price";
import { useAdmin } from "@/features/admin/hooks/useAdmin";
import {
  restoreProductAction,
  deleteProductFromCatalogAction,
  bulkDeleteProductsFromCatalogAction,
} from "@/features/admin/actions/product.actions";

import type { ProductWithDetails } from "@/lib/db/products";

interface ArchivedProductsTableProps {
  products: ProductWithDetails[];
}

export function ArchivedProductsTable({ products }: ArchivedProductsTableProps) {
  const { execute, loading, error, clearError } = useAdmin();
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [singleDeleteTarget, setSingleDeleteTarget] = React.useState<ProductWithDetails | null>(null);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = React.useState(false);

  const allSelected = products.length > 0 && selectedIds.length === products.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < products.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleRestore(id: string) {
    await execute(() => restoreProductAction(id));
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  }

  async function handleSingleDeleteConfirm() {
    if (!singleDeleteTarget) return;
    const res = await execute(() => deleteProductFromCatalogAction(singleDeleteTarget.id));
    if (res?.success) {
      setSelectedIds((prev) => prev.filter((i) => i !== singleDeleteTarget.id));
      setSingleDeleteTarget(null);
    }
  }

  async function handleBulkDeleteConfirm() {
    if (selectedIds.length === 0) return;
    const res = await execute(() => bulkDeleteProductsFromCatalogAction(selectedIds));
    if (res?.success) {
      setSelectedIds([]);
      setIsBulkConfirmOpen(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Error alert */}
      {error && (
        <div className="flex items-center justify-between rounded-[var(--kit-radius-md)] border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-3.5 text-xs text-[var(--kit-danger)] font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-[var(--kit-danger)] hover:underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bulk selection action toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] px-4 py-2.5 shadow-[var(--kit-shadow-sm)] animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-sm text-[var(--kit-text-primary)] font-medium">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--kit-accent)] text-[11px] font-bold text-white">
              {selectedIds.length}
            </span>
            <span>product{selectedIds.length > 1 ? "s" : ""} selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)] transition-colors px-2 py-1"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={() => setIsBulkConfirmOpen(true)}
              disabled={loading}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-[var(--kit-radius-md)] px-3 py-1.5 text-xs font-semibold",
                "bg-[var(--kit-danger)] text-white hover:opacity-90 transition-opacity"
              )}
            >
              <Trash2 size={13} />
              Delete from Catalog ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-[var(--kit-shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--kit-border)] bg-[var(--kit-surface)]">
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={toggleSelectAll}
                  aria-label="Select all products"
                  className="h-4 w-4 rounded border-[var(--kit-border)] text-[var(--kit-accent)] focus:ring-[var(--kit-accent)] cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Product</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Category</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Archived Date</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Price</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--kit-border)]">
            {products.map((product) => {
              const primaryImg = product.images.find((i) => i.is_primary)?.url ?? product.images[0]?.url;
              const isSelected = selectedIds.includes(product.id);
              const archivedDate = product.archived_at
                ? new Date(product.archived_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "—";

              return (
                <tr
                  key={product.id}
                  className={clsx(
                    "transition-colors",
                    isSelected ? "bg-[var(--kit-accent)]/5" : "hover:bg-[var(--kit-surface)]"
                  )}
                >
                  {/* Select Checkbox */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(product.id)}
                      aria-label={`Select ${product.name}`}
                      className="h-4 w-4 rounded border-[var(--kit-border)] text-[var(--kit-accent)] focus:ring-[var(--kit-accent)] cursor-pointer"
                    />
                  </td>

                  {/* Name + Thumbnail */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)]">
                        {primaryImg ? (
                          <Image
                            src={primaryImg}
                            alt={product.name}
                            fill
                            sizes="40px"
                            className="object-cover opacity-70"
                          />
                        ) : (
                          <Package size={18} className="text-[var(--kit-text-muted)]" />
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-[var(--kit-text-primary)]">
                          {product.name}
                        </span>
                        <p className="text-xs text-[var(--kit-text-muted)]">{product.slug}</p>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-3 py-3 text-[var(--kit-text-secondary)]">
                    {product.category?.name ?? "Uncategorised"}
                  </td>

                  {/* Archived Date */}
                  <td className="px-3 py-3 text-xs text-[var(--kit-text-muted)]">
                    {archivedDate}
                  </td>

                  {/* Price */}
                  <td className="px-3 py-3 font-medium text-[var(--kit-text-primary)]">
                    <Price amount={product.base_price / 100} size="sm" />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Restore */}
                      <button
                        type="button"
                        onClick={() => handleRestore(product.id)}
                        disabled={loading}
                        title="Restore to draft"
                        className="inline-flex items-center gap-1 rounded-[var(--kit-radius-md)] px-2.5 py-1 text-xs font-medium text-[var(--kit-success)] hover:bg-[var(--kit-success)]/10 transition-colors"
                      >
                        <RotateCcw size={13} />
                        <span>Restore</span>
                      </button>

                      {/* Delete from catalog */}
                      <button
                        type="button"
                        onClick={() => setSingleDeleteTarget(product)}
                        disabled={loading}
                        title="Permanently remove from catalog"
                        className="inline-flex items-center gap-1 rounded-[var(--kit-radius-md)] px-2.5 py-1 text-xs font-medium text-[var(--kit-danger)] hover:bg-[var(--kit-danger)]/10 transition-colors"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Single Product Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(singleDeleteTarget)}
        onClose={() => setSingleDeleteTarget(null)}
        onConfirm={handleSingleDeleteConfirm}
        title={`Delete "${singleDeleteTarget?.name}" from catalog?`}
        description="This will permanently delete all physical product images from storage and remove the product from the catalog. Historical order records and customer receipts will be preserved. This action cannot be undone."
        confirmLabel="Delete from Catalog"
        variant="danger"
        loading={loading}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isBulkConfirmOpen}
        onClose={() => setIsBulkConfirmOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title={`Delete ${selectedIds.length} product${selectedIds.length > 1 ? "s" : ""} from catalog?`}
        description="This will permanently delete all physical images for the selected products from storage and remove them from the catalog. Historical order records and snapshots will remain intact. This action cannot be undone."
        confirmLabel={`Delete ${selectedIds.length} Product${selectedIds.length > 1 ? "s" : ""}`}
        variant="danger"
        loading={loading}
      />
    </div>
  );
}
