"use client";

/**
 * app/(admin)/products/[id]/EditProductForm.tsx
 *
 * Client Component form for editing an existing product.
 * Features:
 *  - Info fields (Name, Slug, Category, Description)
 *  - Pricing fields (Base Price, Sale Price, Cost Price)
 *  - Status & Featured toggle
 *  - Image Manager (add/remove image URLs)
 *  - Variant Editor (edit SKU & price override for existing variants)
 *  - Archive action with confirmation dialog
 */

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Save, Plus, Trash2, Archive, Eye } from "lucide-react";
import { clsx } from "clsx";

import { useAdmin } from "@/features/admin/hooks/useAdmin";
import {
  updateProductAction,
  archiveProductAction,
  addProductImageAction,
  removeProductImageAction,
  updateVariantAction,
} from "@/features/admin/actions/admin.actions";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import type { ProductWithDetails } from "@/lib/db/products";
import type { CategoryRow } from "@/lib/db/categories";

interface EditProductFormProps {
  product: ProductWithDetails;
  categories: CategoryRow[];
}

export function EditProductForm({ product, categories }: EditProductFormProps) {
  const { execute, loading, error } = useAdmin();

  // Basic Form State
  const [name, setName] = React.useState(product.name);
  const [slug, setSlug] = React.useState(product.slug);
  const [description, setDescription] = React.useState(product.description ?? "");
  const [categoryId, setCategoryId] = React.useState(product.category_id ?? "");
  const [status, setStatus] = React.useState(product.status);
  const [priceNGN, setPriceNGN] = React.useState((product.base_price / 100).toString());
  const [salePriceNGN, setSalePriceNGN] = React.useState(
    product.sale_price ? (product.sale_price / 100).toString() : ""
  );
  const [costPriceNGN, setCostPriceNGN] = React.useState(
    product.cost_price ? (product.cost_price / 100).toString() : ""
  );
  const [isFeatured, setIsFeatured] = React.useState(product.is_featured);
  const [seoTitle, setSeoTitle] = React.useState(product.seo_title ?? "");
  const [seoDescription, setSeoDescription] = React.useState(product.seo_description ?? "");

  // Image Manager State
  const [newImageUrl, setNewImageUrl] = React.useState("");
  const [newImageAlt, setNewImageAlt] = React.useState("");

  // Confirm Archive Dialog
  const [archiveConfirmOpen, setArchiveConfirmOpen] = React.useState(false);

  // Handle main form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const basePriceKobo = Math.round((Number(priceNGN) || 0) * 100);
    const salePriceKobo = salePriceNGN ? Math.round(Number(salePriceNGN) * 100) : null;
    const costPriceKobo = costPriceNGN ? Math.round(Number(costPriceNGN) * 100) : null;

    await execute(() =>
      updateProductAction({
        id: product.id,
        name,
        slug,
        description: description || undefined,
        category_id: categoryId || null,
        status: status as "draft" | "published" | "archived",
        base_price: basePriceKobo,
        sale_price: salePriceKobo,
        cost_price: costPriceKobo,
        is_featured: isFeatured,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
      })
    );
  }

  // Handle Image Add
  async function handleAddImage(e: React.FormEvent) {
    e.preventDefault();
    if (!newImageUrl.trim()) return;

    const isPrimary = product.images.length === 0;
    const res = await execute(() =>
      addProductImageAction(product.id, newImageUrl.trim(), newImageAlt.trim() || undefined, isPrimary)
    );

    if (res?.success) {
      setNewImageUrl("");
      setNewImageAlt("");
    }
  }

  // Handle Image Remove
  async function handleRemoveImage(imageId: string) {
    await execute(() => removeProductImageAction(imageId, product.id));
  }

  // Handle Archive Confirm
  async function handleArchiveConfirm() {
    await execute(() => archiveProductAction(product.id));
    setArchiveConfirmOpen(false);
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--kit-text-primary)]">{product.name}</h1>
              <StatusBadge status={product.status} />
            </div>
            <p className="text-xs text-[var(--kit-text-secondary)]">ID: {product.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/products/${product.slug}`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] px-3 text-xs font-medium text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] transition-colors"
          >
            <Eye size={14} /> Storefront Preview
          </Link>

          {product.status !== "archived" && (
            <button
              type="button"
              onClick={() => setArchiveConfirmOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--kit-radius-md)] border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 px-3 text-xs font-medium text-[var(--kit-danger)] hover:bg-[var(--kit-danger)]/20 transition-colors"
            >
              <Archive size={14} /> Archive
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-[var(--kit-radius-md)] border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-4 text-sm text-[var(--kit-danger)]">
          {error}
        </div>
      )}

      {/* Main Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Details Section */}
        <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
          <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Product Information</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="edit-product-name-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Product Name</label>
              <input
                id="edit-product-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="edit-product-slug-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">URL Slug</label>
              <input
                id="edit-product-slug-input"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)] font-mono",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="edit-product-category-select" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Category</label>
              <select
                id="edit-product-category-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              >
                <option value="">None (Uncategorised)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="edit-product-desc-textarea" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Description</label>
              <textarea
                id="edit-product-desc-textarea"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={clsx(
                  "mt-1 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] p-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
          <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Pricing (NGN)</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="edit-product-price-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Base Price (₦)</label>
              <input
                id="edit-product-price-input"
                type="number"
                step="0.01"
                min="0"
                value={priceNGN}
                onChange={(e) => setPriceNGN(e.target.value)}
                required
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="edit-product-saleprice-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Sale Price (₦)</label>
              <input
                id="edit-product-saleprice-input"
                type="number"
                step="0.01"
                min="0"
                value={salePriceNGN}
                onChange={(e) => setSalePriceNGN(e.target.value)}
                placeholder="Optional"
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="edit-product-costprice-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Cost Price (₦)</label>
              <input
                id="edit-product-costprice-input"
                type="number"
                step="0.01"
                min="0"
                value={costPriceNGN}
                onChange={(e) => setCostPriceNGN(e.target.value)}
                placeholder="Optional"
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>
          </div>
        </div>

        {/* Status & Options */}
        <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
          <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Status & Settings</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-product-status-select" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Product Status</label>
              <select
                id="edit-product-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-sm text-[var(--kit-text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--kit-border)] text-[var(--kit-accent)] focus:ring-[var(--kit-accent)]"
                />
                Feature on Homepage
              </label>
            </div>
          </div>
        </div>

        {/* SEO Section */}
        <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
          <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Search Engine Optimization (SEO)</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="edit-seo-title-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">SEO Title</label>
              <input
                id="edit-seo-title-input"
                type="text"
                maxLength={70}
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Meta title for search engines"
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="edit-seo-desc-textarea" className="block text-xs font-medium text-[var(--kit-text-secondary)]">SEO Description</label>
              <textarea
                id="edit-seo-desc-textarea"
                rows={2}
                maxLength={160}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Meta description for search engines"
                className={clsx(
                  "mt-1 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] p-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>
          </div>
        </div>

        {/* Save button for main form */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-4 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save size={14} /> {loading ? "Saving…" : "Save Product Details"}
          </button>
        </div>
      </form>

      {/* Image Manager Section */}
      <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
        <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Product Images</h2>

        {/* Existing Images Grid */}
        {product.images.length === 0 ? (
          <p className="text-xs text-[var(--kit-text-muted)]">No images added yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {product.images.map((img) => (
              <div
                key={img.id}
                className="group relative flex flex-col overflow-hidden rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)]"
              >
                <div className="relative aspect-square w-full">
                  <Image src={img.url} alt={img.alt_text ?? product.name} fill sizes="200px" className="object-cover" />
                  {img.is_primary && (
                    <span className="absolute top-1.5 left-1.5 rounded-[var(--kit-radius-sm)] bg-[var(--kit-accent)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      Primary
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2">
                  <span className="truncate text-[10px] text-[var(--kit-text-muted)]">{img.alt_text || "No alt text"}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img.id)}
                    disabled={loading}
                    className="text-[var(--kit-danger)] hover:opacity-80 p-1"
                    title="Remove image"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Image Form */}
        <form onSubmit={handleAddImage} className="pt-2 border-t border-[var(--kit-border)]">
          <p className="text-xs font-medium text-[var(--kit-text-secondary)] mb-2">Add Image URL</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              required
              className={clsx(
                "h-9 flex-1 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                "focus:border-[var(--kit-accent)] focus:outline-none"
              )}
            />
            <input
              type="text"
              value={newImageAlt}
              onChange={(e) => setNewImageAlt(e.target.value)}
              placeholder="Alt text (optional)"
              className={clsx(
                "h-9 sm:w-48 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                "focus:border-[var(--kit-accent)] focus:outline-none"
              )}
            />
            <button
              type="submit"
              disabled={loading || !newImageUrl.trim()}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] px-3 text-xs font-medium text-[var(--kit-text-primary)] hover:bg-[var(--kit-muted)] transition-colors disabled:opacity-50"
            >
              <Plus size={14} /> Add Image
            </button>
          </div>
        </form>
      </div>

      {/* Variants Section (Edit SKU & Price Override) */}
      {product.variants.length > 0 && (
        <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
          <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Product Variants ({product.variants.length})</h2>

          <div className="divide-y divide-[var(--kit-border)] border border-[var(--kit-border)] rounded-[var(--kit-radius-md)] overflow-hidden">
            {product.variants.map((v) => (
              <VariantRow key={v.id} variant={v} />
            ))}
          </div>
        </div>
      )}

      {/* Archive Confirm Dialog */}
      <ConfirmDialog
        open={archiveConfirmOpen}
        onClose={() => setArchiveConfirmOpen(false)}
        onConfirm={handleArchiveConfirm}
        title="Archive Product?"
        description="This will set the product status to archived and hide it from storefront catalog listings."
        confirmLabel="Archive Product"
        variant="danger"
        loading={loading}
      />
    </div>
  );
}

function VariantRow({ variant }: { variant: ProductWithDetails["variants"][0] }) {
  const { execute, loading } = useAdmin();
  const [sku, setSku] = React.useState(variant.sku ?? "");
  const [overrideNGN, setOverrideNGN] = React.useState(
    variant.price_override ? (variant.price_override / 100).toString() : ""
  );

  async function handleSaveVariant() {
    const overrideKobo = overrideNGN ? Math.round(Number(overrideNGN) * 100) : null;
    await execute(() =>
      updateVariantAction({
        id: variant.id,
        sku: sku || null,
        price_override: overrideKobo,
      })
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between bg-[var(--kit-surface)]">
      <div className="text-xs font-mono text-[var(--kit-text-secondary)]">ID: {variant.id.slice(0, 8)}…</div>
      <div className="flex flex-1 items-center gap-3 sm:justify-end">
        <input
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="SKU"
          className="h-8 w-32 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-card)] px-2 text-xs font-mono text-[var(--kit-text-primary)]"
        />
        <input
          type="number"
          step="0.01"
          value={overrideNGN}
          onChange={(e) => setOverrideNGN(e.target.value)}
          placeholder="Price Override (₦)"
          className="h-8 w-36 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-card)] px-2 text-xs text-[var(--kit-text-primary)]"
        />
        <button
          type="button"
          onClick={handleSaveVariant}
          disabled={loading}
          className="h-8 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-card)] px-3 text-xs font-medium text-[var(--kit-text-primary)] hover:bg-[var(--kit-muted)] transition-colors disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}
