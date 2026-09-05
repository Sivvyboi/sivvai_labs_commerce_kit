"use client";

/**
 * app/(admin)/products/[id]/EditProductForm.tsx
 *
 * Client Component form for editing an existing product.
 * Features:
 *  - Info fields (Name, Slug, Category, Description)
 *  - Pricing fields (Base Price, Sale Price, Cost Price) with dynamic store currency
 *  - Status (Draft / Published / Archived) with Publish, Unpublish, and Archive quick actions
 *  - Image Manager (add/remove image URLs)
 *  - Option Group & Value Manager (Size, Color, etc.)
 *  - Variant Editor (edit SKU & price override for existing variants)
 *  - Archive action with confirmation dialog
 */

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Save, Plus, Trash2, Archive, Eye, CheckCircle, EyeOff, RotateCcw, Upload, Loader2, ArrowRight } from "lucide-react";
import { clsx } from "clsx";

import { useAdmin } from "@/features/admin/hooks/useAdmin";
import { useCurrency } from "@/components/shared/CurrencyProvider";
import { compressImageInBrowser } from "@/lib/utils/image-compression";
import {
  updateProductAction,
  archiveProductAction,
  publishProductAction,
  unpublishProductAction,
  addProductImageAction,
  removeProductImageAction,
  updateVariantAction,
  createOptionGroupAction,
  deleteOptionGroupAction,
  addOptionValueAction,
  deleteOptionValueAction,
  restoreProductAction,
  generateProductImageUploadUrlAction,
  syncProductVariantsAction,
  setDefaultVariantAction,
  toggleVariantStatusAction,
  setVariantStockAction,
} from "@/features/admin/actions/product.actions";
import { formatCombinationLabel, generateCartesianCombinations } from "@/lib/variants/combination";

import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { AnimatedFeedbackOverlay, type FeedbackStatus } from "@/components/admin/ui/AnimatedFeedbackOverlay";
import { PublishProductModal } from "@/components/admin/ui/PublishProductModal";
import type { ProductWithDetails } from "@/lib/db/products";
import type { CategoryRow } from "@/lib/db/categories";

interface EditProductFormProps {
  product: ProductWithDetails;
  categories: CategoryRow[];
}

export function EditProductForm({ product, categories }: EditProductFormProps) {
  const { execute, loading, error } = useAdmin();
  const storeCurrency = useCurrency();

  // Basic Form State
  const [name, setName] = React.useState(product.name);
  const [slug, setSlug] = React.useState(product.slug);
  const [description, setDescription] = React.useState(product.description ?? "");
  const [categoryId, setCategoryId] = React.useState(product.category_id ?? "");
  const [status, setStatus] = React.useState(product.status);
  const [price, setPrice] = React.useState((product.base_price / 100).toString());
  const [salePrice, setSalePrice] = React.useState(
    product.sale_price ? (product.sale_price / 100).toString() : ""
  );
  const [costPrice, setCostPrice] = React.useState(
    product.cost_price ? (product.cost_price / 100).toString() : ""
  );
  const [isFeatured, setIsFeatured] = React.useState(product.is_featured);
  const [seoTitle, setSeoTitle] = React.useState(product.seo_title ?? "");
  const [seoDescription, setSeoDescription] = React.useState(product.seo_description ?? "");

  // Image Manager State
  const [newImageUrl, setNewImageUrl] = React.useState("");
  const [newImageAlt, setNewImageAlt] = React.useState("");
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Option Group State
  const [newOptionGroupName, setNewOptionGroupName] = React.useState("");

  const possibleCombos = React.useMemo(() => {
    return generateCartesianCombinations(product.option_groups || []);
  }, [product.option_groups]);

  async function handleSyncVariants() {
    setFeedback({
      status: "loading",
      title: "Syncing Variants…",
      message: "Generating Cartesian combinations and updating variants",
    });
    const res = await execute(() => syncProductVariantsAction(product.id));
    if (res?.success && res.result) {
      setFeedback({
        status: "success",
        title: "Variants Synchronized!",
        message: `Generated and synced variants (Created: ${res.result.created}, Reactivated: ${res.result.reactivated}, Retired: ${res.result.retired}, Total active: ${res.result.total}).`,
      });
    } else {
      setFeedback({
        status: "error",
        title: "Sync Failed",
        message: res?.error || "Could not sync variants.",
        errorDetails: res?.error,
        onRetry: handleSyncVariants,
      });
    }
  }

  // Confirm Archive Dialog
  const [archiveConfirmOpen, setArchiveConfirmOpen] = React.useState(false);

  // Publish Modal & Animated Feedback State
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    status: FeedbackStatus;
    title?: string;
    message?: string;
    errorDetails?: string | null;
    onRetry?: () => void;
  }>({ status: "idle" });

  // Save Changes handler — saves metadata updates without changing status or unpublishing
  async function handleSaveChanges(e?: React.FormEvent) {
    if (e) e.preventDefault();

    setFeedback({
      status: "loading",
      title: "Saving Product Changes…",
      message: "Writing metadata updates to database",
    });

    const basePriceKobo = Math.round((Number(price) || 0) * 100);
    const salePriceKobo = salePrice ? Math.round(Number(salePrice) * 100) : null;
    const costPriceKobo = costPrice ? Math.round(Number(costPrice) * 100) : null;

    const updateRes = await execute(
      () =>
        updateProductAction({
          id: product.id,
          name,
          slug,
          description: description || undefined,
          category_id: categoryId || null,
          base_price: basePriceKobo,
          sale_price: salePriceKobo,
          cost_price: costPriceKobo,
          is_featured: isFeatured,
          seo_title: seoTitle || null,
          seo_description: seoDescription || null,
        }),
      { refresh: true }
    );

    if (updateRes?.success) {
      setFeedback({
        status: "success",
        title: "Changes Saved!",
        message: "Product metadata has been successfully updated.",
      });
    } else {
      setFeedback({
        status: "error",
        title: "Save Failed",
        message: "Could not save product details.",
        errorDetails: updateRes?.error ?? error ?? "Failed to save product fields",
        onRetry: () => handleSaveChanges(),
      });
    }
  }

  // Save draft modal handler — saves field updates and sets status to draft (warns if product is published)
  async function handleSaveAsDraftModal() {
    setIsPublishModalOpen(false);

    if (status === "published") {
      const confirmUnpublish = window.confirm(
        "This product is currently published. Saving as draft will unpublish it from the storefront catalog. Do you want to continue?"
      );
      if (!confirmUnpublish) return;
    }

    setFeedback({
      status: "loading",
      title: "Saving Product Draft…",
      message: "Writing product changes to Supabase database",
    });

    const basePriceKobo = Math.round((Number(price) || 0) * 100);
    const salePriceKobo = salePrice ? Math.round(Number(salePrice) * 100) : null;
    const costPriceKobo = costPrice ? Math.round(Number(costPrice) * 100) : null;

    const updateRes = await execute(
      () =>
        updateProductAction({
          id: product.id,
          name,
          slug,
          description: description || undefined,
          category_id: categoryId || null,
          base_price: basePriceKobo,
          sale_price: salePriceKobo,
          cost_price: costPriceKobo,
          is_featured: isFeatured,
          seo_title: seoTitle || null,
          seo_description: seoDescription || null,
        }),
      { refresh: true }
    );

    if (updateRes?.success) {
      if (status === "published") {
        await unpublishProductAction(product.id);
        setStatus("draft");
      }
      setFeedback({
        status: "success",
        title: "Saved as Draft!",
        message: "Product updates have been saved to Supabase.",
      });
    } else {
      setFeedback({
        status: "error",
        title: "Save Draft Failed",
        message: "Could not save product details in Supabase.",
        errorDetails: updateRes?.error ?? error ?? "Failed to save product fields",
        onRetry: handleSaveAsDraftModal,
      });
    }
  }


  // Publish modal handler
  async function handlePublishModal() {
    setIsPublishModalOpen(false);
    setFeedback({
      status: "loading",
      title: "Publishing Product…",
      message: "Publishing product status to Supabase",
    });

    const res = await execute(() => publishProductAction(product.id));

    if (res?.success) {
      setStatus("published");
      setFeedback({
        status: "success",
        title: "Product Published!",
        message: "This product is now live on your storefront catalog.",
      });
    } else {
      setFeedback({
        status: "error",
        title: "Publish Failed",
        message: "Could not publish product to Supabase.",
        errorDetails: res?.error ?? error ?? "Unknown error",
        onRetry: handlePublishModal,
      });
    }
  }



  // Unpublish modal handler
  async function handleUnpublishModal() {
    setIsPublishModalOpen(false);
    setFeedback({
      status: "loading",
      title: "Unpublishing Product…",
      message: "Setting status back to draft in Supabase",
    });

    const res = await execute(() => unpublishProductAction(product.id));
    if (res?.success) {
      setStatus("draft");
      setFeedback({
        status: "success",
        title: "Unpublished to Draft",
        message: "Product is now hidden from storefront catalog listings.",
      });
    } else {
      setFeedback({
        status: "error",
        title: "Unpublish Failed",
        message: "Failed to update product status.",
        errorDetails: res?.error ?? error,
        onRetry: handleUnpublishModal,
      });
    }
  }

  // Archive modal handler
  async function handleArchiveModal() {
    setIsPublishModalOpen(false);
    setFeedback({
      status: "loading",
      title: "Archiving Product…",
      message: "Archiving product record in Supabase",
    });

    const res = await execute(() => archiveProductAction(product.id));
    if (res?.success) {
      setStatus("archived");
      setFeedback({
        status: "success",
        title: "Product Archived",
        message: "Product has been moved to archived status.",
      });
    } else {
      setFeedback({
        status: "error",
        title: "Archive Failed",
        message: "Failed to archive product.",
        errorDetails: res?.error ?? error,
        onRetry: handleArchiveModal,
      });
    }
  }

  // Quick Action: Publish
  async function handlePublish() {
    const res = await execute(() => publishProductAction(product.id));
    if (res?.success) setStatus("published");
  }

  // Quick Action: Unpublish
  async function handleUnpublish() {
    const res = await execute(() => unpublishProductAction(product.id));
    if (res?.success) setStatus("draft");
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

  // Handle Direct File Upload (with in-browser WebP compression)
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setUploadError(null);
    setUploadingImage(true);

    try {
      // Compress & convert to optimized WebP in browser before uploading
      const compressedFile = await compressImageInBrowser(rawFile);

      const signedRes = await generateProductImageUploadUrlAction({
        filename: compressedFile.name,
        contentType: compressedFile.type,
      });

      if (!signedRes.success || !signedRes.signedUrl || !signedRes.publicUrl) {
        throw new Error(signedRes.error ?? "Failed to get signed upload URL");
      }

      const uploadRes = await fetch(signedRes.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": compressedFile.type },
        body: compressedFile,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image file to storage bucket");
      }

      const isPrimary = product.images.length === 0;
      await execute(() =>
        addProductImageAction(
          product.id,
          signedRes.publicUrl!,
          rawFile.name.replace(/\.[^/.]+$/, ""),
          isPrimary
        )
      );
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Handle Image Remove
  async function handleRemoveImage(imageId: string) {
    await execute(() => removeProductImageAction(imageId, product.id));
  }

  // Handle Option Group Creation
  async function handleAddOptionGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newOptionGroupName.trim()) return;
    const res = await execute(() => createOptionGroupAction(product.id, newOptionGroupName.trim()));
    if (res?.success) setNewOptionGroupName("");
  }

  // Handle Archive Confirm
  async function handleArchiveConfirm() {
    await execute(() => archiveProductAction(product.id));
    setArchiveConfirmOpen(false);
    setStatus("archived");
  }

  // Handle Restore
  async function handleRestore() {
    const res = await execute(() => restoreProductAction(product.id));
    if (res?.success) setStatus("draft");
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
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-[var(--kit-text-secondary)]">ID: {product.id}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Save Changes Button */}
          <button
            type="button"
            onClick={() => handleSaveChanges()}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-3.5 text-xs font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-50"
          >
            <Save size={14} /> Save Changes
          </button>

          {/* Storefront Preview */}
          <Link
            href={`/products/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Preview how product looks on storefront"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--kit-radius-md)] border border-[var(--kit-accent)]/30 bg-[var(--kit-accent)]/10 px-3.5 text-xs font-semibold text-[var(--kit-accent)] hover:bg-[var(--kit-accent)]/20 transition-colors"
          >
            <Eye size={14} /> Storefront Preview
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-[var(--kit-radius-md)] border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-4 text-sm text-[var(--kit-danger)]">
          {error}
        </div>
      )}

      {/* Main Edit Form */}
      <form onSubmit={handleSaveChanges} className="space-y-6">
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
          <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Pricing ({storeCurrency})</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="edit-product-price-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Base Price</label>
              <input
                id="edit-product-price-input"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="edit-product-saleprice-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Sale Price</label>
              <input
                id="edit-product-saleprice-input"
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
              <label htmlFor="edit-product-costprice-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Cost Price</label>
              <input
                id="edit-product-costprice-input"
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

        {/* Add Image Options */}
        <div className="pt-3 border-t border-[var(--kit-border)] space-y-3">
          {uploadError && (
            <div className="rounded-[var(--kit-radius-md)] border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-2.5 text-xs text-[var(--kit-danger)]">
              {uploadError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Direct File Upload Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploadingImage}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-4 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {uploadingImage ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Uploading to Supabase...
                </>
              ) : (
                <>
                  <Upload size={14} /> Upload Image File
                </>
              )}
            </button>

            <span className="text-xs text-[var(--kit-text-muted)] text-center sm:text-left">or add via URL</span>
          </div>

          {/* Add Image URL Form */}
          <form onSubmit={handleAddImage} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
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
              disabled={loading || uploadingImage || !newImageUrl.trim()}
              className={clsx(
                "inline-flex h-9 items-center justify-center gap-1 rounded-[var(--kit-radius-md)] px-4 text-xs font-medium transition-colors",
                newImageUrl.trim()
                  ? "bg-[var(--kit-accent)] text-white hover:opacity-90"
                  : "border border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-text-muted)] cursor-not-allowed opacity-60"
              )}
            >
              <Plus size={14} /> Add URL
            </button>
          </form>
        </div>
      </div>

      {/* Option Groups & Values Section */}
      <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
        <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Option Groups & Attribute Values</h2>

        {(product.option_groups ?? []).length === 0 ? (
          <p className="text-xs text-[var(--kit-text-muted)]">No option groups added yet (e.g. Size, Color).</p>
        ) : (
          <div className="space-y-4">
            {(product.option_groups ?? []).map((group) => (
              <OptionGroupCard key={group.id} group={group} productId={product.id} />
            ))}
          </div>
        )}

        {/* Add Option Group Form */}
        <form onSubmit={handleAddOptionGroup} className="pt-2 border-t border-[var(--kit-border)]">
          <p className="text-xs font-medium text-[var(--kit-text-secondary)] mb-2">Create New Option Group</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newOptionGroupName}
              onChange={(e) => setNewOptionGroupName(e.target.value)}
              placeholder="e.g. Size, Color, Material"
              required
              className={clsx(
                "h-9 flex-1 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                "focus:border-[var(--kit-accent)] focus:outline-none"
              )}
            />
            <button
              type="submit"
              disabled={loading || !newOptionGroupName.trim()}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] px-3 text-xs font-medium text-[var(--kit-text-primary)] hover:bg-[var(--kit-muted)] transition-colors disabled:opacity-50"
            >
              <Plus size={14} /> Add Option Group
            </button>
          </div>
        </form>

        {/* Sync Variants Button if Option Groups exist */}
        {product.option_groups && product.option_groups.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--kit-border)]">
            <div className="text-xs text-[var(--kit-text-secondary)]">
              Target combinations:{" "}
              <span className="font-semibold text-[var(--kit-text-primary)]">
                {possibleCombos.length}
              </span>{" "}
              {possibleCombos.length === 1 ? "variant" : "variants"}
            </div>
            <button
              type="button"
              onClick={handleSyncVariants}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-3 text-xs font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
            >
              <RotateCcw size={13} className={loading ? "animate-spin" : ""} />
              <span>Generate / Sync Variants ({possibleCombos.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Variants Section (Edit SKU & Price Override) */}
      <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">
            Product Variants ({product.variants.length})
          </h2>
          <button
            type="button"
            onClick={handleSyncVariants}
            disabled={loading}
            className="inline-flex h-7 items-center gap-1 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] px-2.5 text-xs font-medium text-[var(--kit-text-primary)] hover:bg-[var(--kit-muted)] transition-colors disabled:opacity-50"
          >
            <RotateCcw size={12} className={loading ? "animate-spin" : ""} />
            Sync Variants
          </button>
        </div>

        {product.variants.length === 0 ? (
          <p className="text-xs text-[var(--kit-text-muted)]">No variants found. Click Sync Variants to generate them.</p>
        ) : (
          <div className="divide-y divide-[var(--kit-border)] border border-[var(--kit-border)] rounded-[var(--kit-radius-md)] overflow-hidden">
            {product.variants.map((v) => (
              <VariantRow
                key={v.id}
                variant={v}
                productId={product.id}
                storeCurrency={storeCurrency}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Bar: Save Changes and Next (Review & Publish) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 pb-12 border-t border-[var(--kit-border)]">
        <button
          type="button"
          onClick={() => handleSaveChanges()}
          disabled={loading}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--kit-accent)] bg-[var(--kit-accent)]/10 px-6 text-sm font-bold text-[var(--kit-accent)] hover:bg-[var(--kit-accent)]/20 transition-all disabled:opacity-50"
        >
          <Save size={16} />
          <span>Save Changes</span>
        </button>

        <button
          type="button"
          onClick={() => setIsPublishModalOpen(true)}
          className="inline-flex h-11 items-center gap-2.5 rounded-xl bg-[var(--kit-accent)] px-6 text-sm font-bold text-white hover:opacity-90 transition-all shadow-md hover:shadow-lg active:scale-98"
        >
          <span>Next: Review & Publish</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Review & Publish Modal */}
      <PublishProductModal
        isOpen={isPublishModalOpen}
        productName={name}
        productSlug={slug}
        status={status as "draft" | "published" | "archived"}
        isFeatured={isFeatured}
        imageCount={product.images?.length ?? 0}
        variantCount={product.variants?.length ?? 0}
        onToggleFeatured={(val) => setIsFeatured(val)}
        onSaveAsDraft={handleSaveAsDraftModal}
        onPublish={handlePublishModal}
        onUnpublish={handleUnpublishModal}
        onArchive={handleArchiveModal}
        onClose={() => setIsPublishModalOpen(false)}
      />

      {/* Full-Screen Animated Feedback Overlay */}
      <AnimatedFeedbackOverlay
        status={feedback.status}
        title={feedback.title}
        message={feedback.message}
        errorDetails={feedback.errorDetails}
        onClose={() => setFeedback({ status: "idle" })}
        onRetry={feedback.onRetry}
      />

      {/* Archive Confirm Dialog */}
      <ConfirmDialog
        open={archiveConfirmOpen}
        onClose={() => setArchiveConfirmOpen(false)}
        onConfirm={handleArchiveModal}
        title="Archive Product?"
        description="This will set the product status to archived and hide it from storefront catalog listings."
        confirmLabel="Archive Product"
        variant="danger"
        loading={loading}
      />
    </div>
  );
}

function OptionGroupCard({
  group,
  productId,
}: {
  group: NonNullable<ProductWithDetails["option_groups"]>[0];
  productId: string;
}) {
  const { execute, loading } = useAdmin();
  const [newValueLabel, setNewValueLabel] = React.useState("");

  async function handleDeleteGroup() {
    await execute(() => deleteOptionGroupAction(group.id, productId));
  }

  async function handleAddValue(e: React.FormEvent) {
    e.preventDefault();
    if (!newValueLabel.trim()) return;
    const res = await execute(() => addOptionValueAction(group.id, newValueLabel.trim(), productId));
    if (res?.success) setNewValueLabel("");
  }

  async function handleDeleteValue(valueId: string) {
    await execute(() => deleteOptionValueAction(valueId, productId));
  }

  return (
    <div className="rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[var(--kit-text-primary)] uppercase tracking-wider">{group.name}</h3>
        <button
          type="button"
          onClick={handleDeleteGroup}
          disabled={loading}
          className="text-xs text-[var(--kit-danger)] hover:opacity-80 p-1 flex items-center gap-1"
        >
          <Trash2 size={12} /> Remove Group
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(group.values ?? []).map((val) => (
          <span
            key={val.id}
            className="inline-flex items-center gap-1.5 rounded-[var(--kit-radius-sm)] border border-[var(--kit-border)] bg-[var(--kit-card)] px-2.5 py-1 text-xs text-[var(--kit-text-primary)]"
          >
            {val.label}
            <button
              type="button"
              onClick={() => handleDeleteValue(val.id)}
              disabled={loading}
              className="text-[var(--kit-text-muted)] hover:text-[var(--kit-danger)] transition-colors"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <form onSubmit={handleAddValue} className="flex gap-2 pt-1">
        <input
          type="text"
          value={newValueLabel}
          onChange={(e) => setNewValueLabel(e.target.value)}
          placeholder={`Add ${group.name} value (e.g. Medium)`}
          className="h-8 flex-1 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-card)] px-2.5 text-xs text-[var(--kit-text-primary)]"
        />
        <button
          type="submit"
          disabled={loading || !newValueLabel.trim()}
          className="h-8 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-card)] px-3 text-xs font-medium text-[var(--kit-text-primary)] hover:bg-[var(--kit-muted)] transition-colors disabled:opacity-50"
        >
          Add Value
        </button>
      </form>
    </div>
  );
}

function VariantRow({
  variant,
  productId,
  storeCurrency,
}: {
  variant: ProductWithDetails["variants"][0];
  productId: string;
  storeCurrency: string;
}) {
  const { execute, loading } = useAdmin();
  const [sku, setSku] = React.useState(variant.sku ?? "");
  const [overridePrice, setOverridePrice] = React.useState(
    variant.price_override ? (variant.price_override / 100).toString() : ""
  );

  const inv = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory;
  const stock = inv?.on_hand_quantity ?? 0;
  const [stockQty, setStockQty] = React.useState(stock);

  async function handleSaveVariant() {
    const overrideKobo = overridePrice ? Math.round(Number(overridePrice) * 100) : null;
    const saves: Promise<unknown>[] = [
      execute(() =>
        updateVariantAction(
          {
            id: variant.id,
            sku: sku || null,
            price_override: overrideKobo,
          },
          productId
        )
      ),
    ];
    // Only call the stock action if the quantity has actually changed and we have a record id
    if (inv?.id && stockQty !== stock) {
      saves.push(
        execute(() =>
          setVariantStockAction(variant.id, inv.id, stockQty, productId)
        )
      );
    }
    await Promise.all(saves);
  }

  async function handleSetDefault() {
    if (variant.is_default) return;
    await execute(() => setDefaultVariantAction(productId, variant.id));
  }

  async function handleToggleStatus() {
    const nextStatus = variant.status === "active" ? "inactive" : "active";
    await execute(() => toggleVariantStatusAction(variant.id, nextStatus, productId));
  }

  const comboLabel = formatCombinationLabel(variant.option_combination as Record<string, string>);

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between bg-[var(--kit-surface)] hover:bg-[var(--kit-muted)]/20 transition-colors">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-[var(--kit-text-primary)] rounded-[var(--kit-radius-sm)] bg-[var(--kit-card)] border border-[var(--kit-border)] px-2 py-1">
          {comboLabel}
        </span>

        {variant.is_default ? (
          <span className="rounded bg-[var(--kit-accent)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--kit-accent)]">
            ★ Default
          </span>
        ) : (
          <button
            type="button"
            onClick={handleSetDefault}
            disabled={loading}
            className="text-[10px] text-[var(--kit-text-muted)] hover:text-[var(--kit-accent)] underline transition-colors"
          >
            Set as Default
          </button>
        )}

        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={loading}
          className={clsx(
            "rounded px-2 py-0.5 text-[10px] font-semibold transition-colors",
            variant.status === "active"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:opacity-80"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:opacity-80"
          )}
        >
          {variant.status === "active" ? "Active" : "Inactive"}
        </button>

        <div className="flex items-center gap-1 text-xs text-[var(--kit-text-muted)] font-mono">
          <span>Stock:</span>
          <input
            type="number"
            min={0}
            step={1}
            value={stockQty}
            onChange={(e) => setStockQty(Math.max(0, Math.floor(Number(e.target.value))))}
            className="h-6 w-16 rounded border border-[var(--kit-border)] bg-[var(--kit-card)] px-1.5 text-xs font-mono text-[var(--kit-text-primary)] text-center"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
          value={overridePrice}
          onChange={(e) => setOverridePrice(e.target.value)}
          placeholder={`Override (${storeCurrency})`}
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
