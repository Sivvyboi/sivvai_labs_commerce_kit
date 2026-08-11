"use client";

/**
 * app/admin/products/new/NewProductForm.tsx
 *
 * New Product Creation Form — Client Component.
 * Receives categories as props from the parent Server Component.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { clsx } from "clsx";

import { useAdmin } from "@/features/admin/hooks/useAdmin";
import { createProductAction } from "@/features/admin/actions/admin.actions";
import { useCurrency } from "@/components/shared/CurrencyProvider";
import type { CategoryRow } from "@/lib/db/categories";

interface NewProductFormProps {
  categories: CategoryRow[];
}

export function NewProductForm({ categories }: NewProductFormProps) {
  const router = useRouter();
  const { execute, loading, error } = useAdmin();
  const storeCurrency = useCurrency();

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [autoSlug, setAutoSlug] = React.useState(true);
  const [sku, setSku] = React.useState("");
  const [initialStock, setInitialStock] = React.useState("10");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [status, setStatus] = React.useState<"draft" | "published">("draft");
  const [price, setPrice] = React.useState("");
  const [salePrice, setSalePrice] = React.useState("");
  const [costPrice, setCostPrice] = React.useState("");
  const [isFeatured, setIsFeatured] = React.useState(false);
  const [seoTitle, setSeoTitle] = React.useState("");
  const [seoDescription, setSeoDescription] = React.useState("");

  function handleNameChange(val: string) {
    setName(val);
    if (autoSlug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-")
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Convert inputs to kobo/cents (minor units)
    const basePriceKobo = Math.round((Number(price) || 0) * 100);
    const salePriceKobo = salePrice ? Math.round(Number(salePrice) * 100) : null;
    const costPriceKobo = costPrice ? Math.round(Number(costPrice) * 100) : null;

    const result = await execute(() =>
      createProductAction({
        name,
        slug,
        sku: sku || undefined,
        description: description || undefined,
        category_id: categoryId || null,
        status: "draft",
        base_price: basePriceKobo,
        sale_price: salePriceKobo,
        cost_price: costPriceKobo,
        is_featured: isFeatured,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        initial_stock: Number(initialStock) || 0,
        track_inventory: true,
      })
    );

    if (result?.success && result.product) {
      router.push(`/admin/products/${result.product.id}`);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/products"
          className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--kit-text-primary)]">New Product</h1>
          <p className="text-xs text-[var(--kit-text-secondary)]">Create a new item in your store catalog</p>
        </div>
      </div>

      {error && (
        <div className="rounded-[var(--kit-radius-md)] border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-4 text-sm text-[var(--kit-danger)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
          <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Product Information</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="new-product-name-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                Product Name <span className="text-[var(--kit-danger)]">*</span>
              </label>
              <input
                id="new-product-name-input"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Vintage Denim Jacket"
                required
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="new-product-slug-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                URL Slug <span className="text-[var(--kit-danger)]">*</span>
              </label>
              <input
                id="new-product-slug-input"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setAutoSlug(false);
                }}
                required
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)] font-mono",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="new-product-category-select" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                Category
              </label>
              <select
                id="new-product-category-select"
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
              <label htmlFor="new-product-desc-textarea" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                Description
              </label>
              <textarea
                id="new-product-desc-textarea"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product description and features…"
                className={clsx(
                  "mt-1 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] p-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>
          </div>
        </div>

        {/* Pricing & Inventory */}
        <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
          <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Pricing ({storeCurrency}) & Initial Inventory</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="new-product-price-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                Base Price <span className="text-[var(--kit-danger)]">*</span>
              </label>
              <input
                id="new-product-price-input"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="new-product-saleprice-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                Sale Price
              </label>
              <input
                id="new-product-saleprice-input"
                type="number"
                step="0.01"
                min="0"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="Optional"
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="new-product-costprice-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                Cost Price
              </label>
              <input
                id="new-product-costprice-input"
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="Optional"
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="new-product-sku-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                SKU (Stock Keeping Unit)
              </label>
              <input
                id="new-product-sku-input"
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. HOODIE-BLK-01"
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)] font-mono",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="new-product-stock-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                Initial Stock Quantity
              </label>
              <input
                id="new-product-stock-input"
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                placeholder="0"
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>
          </div>

          <div className="flex items-center pt-2">
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

        {/* SEO */}
        <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
          <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Search Engine Optimization (SEO)</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="new-product-seotitle-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                SEO Title (max 70 chars)
              </label>
              <input
                id="new-product-seotitle-input"
                type="text"
                maxLength={70}
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={name || "Product Title"}
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="new-product-seodesc-textarea" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                SEO Description (max 160 chars)
              </label>
              <textarea
                id="new-product-seodesc-textarea"
                rows={2}
                maxLength={160}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Meta description for search engines…"
                className={clsx(
                  "mt-1 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] p-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/products"
            className="h-9 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] px-4 text-xs font-medium text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] flex items-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className={clsx(
              "inline-flex h-9 items-center gap-1.5 rounded-[var(--kit-radius-md)] px-4 text-xs font-medium",
              "bg-[var(--kit-accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            )}
          >
            <Plus size={14} /> {loading ? "Creating…" : "Create New Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
