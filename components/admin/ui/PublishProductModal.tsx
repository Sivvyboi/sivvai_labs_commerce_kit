"use client";

/**
 * components/admin/ui/PublishProductModal.tsx
 *
 * Popup review modal opened when clicking the "Next" button at the end of the product edit page.
 * Allows admins to toggle homepage featuring, preview the storefront appearance, save field updates as a draft,
 * or publish/unpublish/archive the product directly.
 */

import * as React from "react";
import Link from "next/link";
import { X, Eye, Save, CheckCircle2, EyeOff, Archive, Sparkles, Image as ImageIcon, Layers } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

export interface PublishProductModalProps {
  isOpen: boolean;
  productName: string;
  productSlug: string;
  status: "draft" | "published" | "archived";
  isFeatured: boolean;
  imageCount: number;
  variantCount: number;
  onToggleFeatured: (featured: boolean) => void;
  onSaveAsDraft: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
  onClose: () => void;
}

export function PublishProductModal({
  isOpen,
  productName,
  productSlug,
  status,
  isFeatured,
  imageCount,
  variantCount,
  onToggleFeatured,
  onSaveAsDraft,
  onPublish,
  onUnpublish,
  onArchive,
  onClose,
}: PublishProductModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--kit-border)] pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--kit-accent)]" />
            <h2 className="text-base font-bold text-[var(--kit-text-primary)]">
              Review & Publish Product
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-[var(--kit-muted-fg)] hover:text-[var(--kit-text-primary)] transition-colors p-1 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Product Card Summary */}
        <div className="rounded-xl border border-[var(--kit-border)] bg-[var(--kit-surface)] p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-[var(--kit-text-primary)] truncate">
                {productName || "Untitled Product"}
              </h3>
              <p className="text-xs font-mono text-[var(--kit-text-secondary)] truncate">
                slug: /{productSlug}
              </p>
            </div>
            <StatusBadge status={status} />
          </div>

          <div className="flex items-center gap-4 text-xs text-[var(--kit-text-secondary)] pt-2 border-t border-[var(--kit-border)]/60">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-[var(--kit-accent)]" />
              <span>{imageCount} {imageCount === 1 ? "Image" : "Images"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[var(--kit-accent)]" />
              <span>{variantCount} {variantCount === 1 ? "Variant" : "Variants"}</span>
            </div>
          </div>
        </div>

        {/* Visibility & Featuring Controls */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--kit-text-secondary)]">
            Storefront Settings
          </h4>

          <label className="flex items-center justify-between p-3 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-surface)] cursor-pointer hover:bg-[var(--kit-muted)]/50 transition-colors">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-[var(--kit-text-primary)] block">
                Feature on Homepage
              </span>
              <span className="text-[11px] text-[var(--kit-text-secondary)] block">
                Highlight this product in the featured carousel on the homepage
              </span>
            </div>
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => onToggleFeatured(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--kit-border)] text-[var(--kit-accent)] focus:ring-[var(--kit-accent)] shrink-0"
            />
          </label>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {/* Main Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Save as Draft */}
            <button
              type="button"
              onClick={onSaveAsDraft}
              className="flex items-center justify-center gap-2 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-surface)] py-2.5 text-xs font-semibold text-[var(--kit-text-primary)] hover:bg-[var(--kit-muted)] transition-colors min-h-[42px]"
            >
              <Save className="h-4 w-4" />
              <span>Save as Draft</span>
            </button>

            {/* Publish or Unpublish */}
            {status === "draft" ? (
              <button
                type="button"
                onClick={onPublish}
                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--kit-success)] py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity min-h-[42px] shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Publish Product</span>
              </button>
            ) : status === "published" ? (
              <button
                type="button"
                onClick={onUnpublish}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-surface)] py-2.5 text-xs font-semibold text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] transition-colors min-h-[42px]"
              >
                <EyeOff className="h-4 w-4" />
                <span>Unpublish to Draft</span>
              </button>
            ) : null}
          </div>

          {/* Secondary Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--kit-border)]/60 text-xs">
            <Link
              href={`/products/${productSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-[var(--kit-accent)] hover:underline"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Storefront Preview</span>
            </Link>

            {status !== "archived" && (
              <button
                type="button"
                onClick={onArchive}
                className="inline-flex items-center gap-1 text-[var(--kit-danger)] hover:underline font-medium"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Archive Product</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
