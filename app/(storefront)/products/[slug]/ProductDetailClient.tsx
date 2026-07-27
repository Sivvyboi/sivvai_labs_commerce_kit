"use client";

/**
 * app/(storefront)/products/[slug]/ProductDetailClient.tsx
 *
 * Core interactive Client Component for the Product Detail Page.
 * Manages gallery image selection, variant selection, quantity state,
 * stock status, Add to Cart, Buy Now (WhatsApp or Checkout), and mobile sticky bar.
 */

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProductWithDetails, ProductVariantRow } from "@/lib/db/products";
import { ProductGallery } from "@/components/storefront/product/ProductGallery";
import { VariantSelector } from "@/components/storefront/product/VariantSelector";
import { QuantitySelector } from "@/components/storefront/product/QuantitySelector";
import { DeliveryEstimate } from "@/components/storefront/product/DeliveryEstimate";
import { Price } from "@/components/shared/Price";
import { StockBadge } from "@/components/shared/StockBadge";
import { useCart } from "@/features/storefront/hooks/useCart";
import { featureFlag } from "@/config/feature-flags";
import { buildWhatsAppUrl } from "@/features/storefront/utils/buildWhatsAppUrl";
import { ROUTES } from "@/constants/routes";
import { ShoppingBag, Zap, Loader2, Share2, Check } from "lucide-react";

export interface ProductDetailClientProps {
  product: ProductWithDetails;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem, isLoading: isCartLoading } = useCart();

  // Find initial variant from URL param ?variant=<uuid> or default variant
  const initialVariantParam = searchParams.get("variant");
  const defaultVariant = useMemo(() => {
    if (initialVariantParam && product.variants) {
      const match = product.variants.find((v) => v.id === initialVariantParam);
      if (match) return match;
    }
    return (
      product.variants?.find((v) => v.is_default && v.status === "active") ??
      product.variants?.find((v) => v.status === "active") ??
      product.variants?.[0] ??
      null
    );
  }, [product.variants, initialVariantParam]);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariantRow | null>(
    defaultVariant
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [overrideImageId, setOverrideImageId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Derived active image ID
  const activeImageId = overrideImageId ?? selectedVariant?.image_id ?? null;

  // Active price & stock
  const activePrice = selectedVariant?.price_override ?? product.base_price;
  const comparePrice = product.compare_at_price;

  const isAvailable =
    product.status === "published" &&
    (!product.variants || product.variants.length === 0 || selectedVariant?.status === "active");

  const stockQuantity = isAvailable ? undefined : 0;

  // Handle Add to Cart
  const handleAddToCart = async () => {
    if (!selectedVariant || !isAvailable || isAdding) return;
    setIsAdding(true);
    try {
      await addItem({
        variantId: selectedVariant.id,
        quantity,
        unitPriceSnapshot: Number(activePrice),
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Handle Buy Now (WhatsApp or Direct Checkout)
  const handleBuyNow = async () => {
    if (!selectedVariant || !isAvailable || isBuying) return;

    if (featureFlag.whatsappCheckout) {
      const waUrl = buildWhatsAppUrl({
        productName: product.name,
        price: activePrice,
      });
      window.open(waUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setIsBuying(true);
    try {
      await addItem({
        variantId: selectedVariant.id,
        quantity,
        unitPriceSnapshot: Number(activePrice),
      });
      router.push(ROUTES.checkout);
    } finally {
      setIsBuying(false);
    }
  };

  // Handle Copy / Share Link
  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
      {/* Product Image Gallery (Left Column - 7 cols on desktop) */}
      <div className="lg:col-span-7">
        <ProductGallery
          images={product.images ?? []}
          productName={product.name}
          selectedImageId={activeImageId}
          onSelectImage={(id) => setOverrideImageId(id)}
        />
      </div>

      {/* Product Info & Actions (Right Column - 5 cols on desktop) */}
      <div className="lg:col-span-5 space-y-6">
        {/* Category & Title Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            {product.category?.name && (
              <span className="text-xs uppercase font-bold tracking-wider text-[var(--kit-accent)]">
                {product.category.name}
              </span>
            )}
            <StockBadge quantity={stockQuantity} variant="default" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--kit-text-primary)] leading-tight">
            {product.name}
          </h1>

          {selectedVariant?.sku && (
            <p className="text-xs text-[var(--kit-muted-fg)] font-mono">
              SKU: {selectedVariant.sku}
            </p>
          )}
        </div>

        {/* Price Display */}
        <div className="flex items-baseline gap-3 pb-4 border-b border-[var(--kit-border)]">
          <Price
            amount={Number(activePrice)}
            originalAmount={comparePrice ? Number(comparePrice) : undefined}
            size="lg"
          />
        </div>

        {/* Variant Selectors (Options: Color, Size, etc.) */}
        {product.variants && product.variants.length > 0 && (
          <VariantSelector
            variants={product.variants}
            optionGroups={product.option_groups}
            selectedVariant={selectedVariant}
            onSelectVariant={(v) => setSelectedVariant(v)}
          />
        )}

        {/* Quantity Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider">
            Quantity
          </label>
          <QuantitySelector
            value={quantity}
            min={1}
            max={99}
            disabled={!isAvailable}
            onChange={(val) => setQuantity(val)}
          />
        </div>

        {/* Desktop Action Buttons */}
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Add to Cart Button */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!isAvailable || isAdding || isCartLoading}
              className="flex items-center justify-center gap-2 rounded-xl bg-[var(--kit-surface)] border border-[var(--kit-border)] px-6 py-3.5 text-sm font-semibold text-[var(--kit-text-primary)] hover:bg-[var(--kit-accent)] hover:text-[var(--kit-accent-fg)] hover:border-[var(--kit-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs min-h-[48px]"
            >
              {isAdding ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ShoppingBag className="h-5 w-5" />
              )}
              <span>Add to Cart</span>
            </button>

            {/* Buy Now Button */}
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!isAvailable || isBuying}
              className="flex items-center justify-center gap-2 rounded-xl bg-[var(--kit-accent)] px-6 py-3.5 text-sm font-semibold text-[var(--kit-accent-fg)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-md min-h-[48px]"
            >
              {isBuying ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Zap className="h-5 w-5 fill-current" />
              )}
              <span>{featureFlag.whatsappCheckout ? "Buy on WhatsApp" : "Buy Now"}</span>
            </button>
          </div>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--kit-muted-fg)] hover:text-[var(--kit-text-primary)] transition-colors min-h-[44px]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-medium">Link copied to clipboard!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span>Share product link</span>
              </>
            )}
          </button>
        </div>

        {/* Product Description */}
        {product.description && (
          <div className="space-y-2 pt-4 border-t border-[var(--kit-border)]">
            <h2 className="text-sm font-bold text-[var(--kit-text-primary)]">
              Product Overview
            </h2>
            <div className="text-xs sm:text-sm text-[var(--kit-text-secondary)] leading-relaxed space-y-2 whitespace-pre-line">
              {product.description}
            </div>
          </div>
        )}

        {/* Delivery Estimate Box */}
        <DeliveryEstimate />
      </div>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[var(--kit-bg)]/95 backdrop-blur-md border-t border-[var(--kit-border)] p-3 px-4 shadow-lg">
        <div className="mx-auto flex items-center justify-between gap-3 max-w-screen-xl">
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--kit-muted-fg)] uppercase truncate font-medium">
              {selectedVariant?.sku ? `SKU: ${selectedVariant.sku}` : product.name}
            </p>
            <Price amount={Number(activePrice)} size="sm" />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!isAvailable || isAdding || isCartLoading}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--kit-surface)] border border-[var(--kit-border)] text-[var(--kit-text-primary)] active:scale-95 disabled:opacity-40 transition-transform min-h-[44px] min-w-[44px]"
              aria-label="Add to cart"
            >
              {isAdding ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ShoppingBag className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!isAvailable || isBuying}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--kit-accent)] px-4 text-xs font-semibold text-[var(--kit-accent-fg)] active:scale-95 disabled:opacity-40 transition-transform min-h-[44px]"
            >
              {isBuying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 fill-current" />
              )}
              <span>{featureFlag.whatsappCheckout ? "WhatsApp" : "Buy Now"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
