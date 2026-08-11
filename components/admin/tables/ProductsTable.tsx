"use client";

/**
 * components/admin/tables/ProductsTable.tsx
 *
 * Products table for the admin products list page.
 * Client Component — manages action row triggers (publish, archive, duplicate).
 */

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Copy, Edit, Eye, Archive, CheckCircle, EyeOff, Package, RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { Price } from "@/components/shared/Price";
import { useAdmin } from "@/features/admin/hooks/useAdmin";
import {
  archiveProductAction,
  publishProductAction,
  unpublishProductAction,
  duplicateProductAction,
  restoreProductAction,
} from "@/features/admin/actions/admin.actions";
import type { ProductWithDetails } from "@/lib/db/products";

interface ProductsTableProps {
  products: ProductWithDetails[];
}

function formatPrice(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

export function ProductsTable({ products }: ProductsTableProps) {
  const { execute, loading } = useAdmin();
  const [archiveTarget, setArchiveTarget] = React.useState<string | null>(null);

  async function handleArchiveConfirm() {
    if (!archiveTarget) return;
    await execute(() => archiveProductAction(archiveTarget));
    setArchiveTarget(null);
  }

  async function handlePublish(id: string) {
    await execute(() => publishProductAction(id));
  }

  async function handleUnpublish(id: string) {
    await execute(() => unpublishProductAction(id));
  }

  async function handleDuplicate(id: string) {
    await execute(() => duplicateProductAction(id));
  }

  async function handleRestore(id: string) {
    await execute(() => restoreProductAction(id));
  }

  return (
    <>
      <div className="overflow-x-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-[var(--kit-shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--kit-border)] bg-[var(--kit-surface)]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Product</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Category</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Status</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Price</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Featured</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--kit-border)]">
            {products.map((product) => {
              const primaryImg = product.images.find((i) => i.is_primary)?.url ?? product.images[0]?.url;

              return (
                <tr key={product.id} className="hover:bg-[var(--kit-surface)] transition-colors">
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
                            className="object-cover"
                          />
                        ) : (
                          <Package size={18} className="text-[var(--kit-text-muted)]" />
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="font-medium text-[var(--kit-text-primary)] hover:text-[var(--kit-accent)] transition-colors"
                        >
                          {product.name}
                        </Link>
                        <p className="text-xs text-[var(--kit-text-muted)]">{product.slug}</p>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-3 py-3 text-[var(--kit-text-secondary)]">
                    {product.category?.name ?? "Uncategorised"}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    <StatusBadge status={product.status} />
                  </td>

                  {/* Price */}
                  <td className="px-3 py-3 font-medium text-[var(--kit-text-primary)]">
                    <Price amount={product.base_price / 100} size="sm" />
                    {product.sale_price && (
                      <span className="ml-1.5 text-xs text-[var(--kit-success)]">
                        (Sale: <Price amount={product.sale_price / 100} size="sm" />)
                      </span>
                    )}
                  </td>

                  {/* Featured */}
                  <td className="px-3 py-3 text-[var(--kit-text-muted)]">
                    {product.is_featured ? (
                      <span className="text-xs font-semibold text-[var(--kit-accent)]">Yes</span>
                    ) : (
                      "No"
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* View on storefront */}
                      <Link
                        href={`/products/${product.slug}`}
                        target="_blank"
                        title="View on storefront"
                        className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
                      >
                        <Eye size={14} />
                      </Link>

                      {/* Edit */}
                      <Link
                        href={`/admin/products/${product.id}`}
                        title="Edit product"
                        className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
                      >
                        <Edit size={14} />
                      </Link>

                      {/* Publish (if draft) */}
                      {product.status === "draft" && (
                        <button
                          type="button"
                          onClick={() => handlePublish(product.id)}
                          disabled={loading}
                          title="Publish product"
                          className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-success)] hover:bg-[var(--kit-success)]/10 transition-colors"
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}

                      {/* Unpublish (if published) */}
                      {product.status === "published" && (
                        <button
                          type="button"
                          onClick={() => handleUnpublish(product.id)}
                          disabled={loading}
                          title="Unpublish product (set to draft)"
                          className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-warning)] hover:bg-[var(--kit-warning)]/10 transition-colors"
                        >
                          <EyeOff size={14} />
                        </button>
                      )}

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => handleDuplicate(product.id)}
                        disabled={loading}
                        title="Duplicate product"
                        className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
                      >
                        <Copy size={14} />
                      </button>

                      {/* Archive (non-archived products) */}
                      {product.status !== "archived" && (
                        <button
                          type="button"
                          onClick={() => setArchiveTarget(product.id)}
                          disabled={loading}
                          title="Archive product"
                          className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-danger)] hover:bg-[var(--kit-danger)]/10 transition-colors"
                        >
                          <Archive size={14} />
                        </button>
                      )}

                      {/* Restore (archived products only) */}
                      {product.status === "archived" && (
                        <button
                          type="button"
                          onClick={() => handleRestore(product.id)}
                          disabled={loading}
                          title="Restore to draft"
                          className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-success)] hover:bg-[var(--kit-success)]/10 transition-colors"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive product?"
        description="This will hide the product from the storefront catalog."
        confirmLabel="Archive"
        variant="danger"
        loading={loading}
      />
    </>
  );
}
