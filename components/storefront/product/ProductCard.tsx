"use client";

/**
 * components/storefront/product/ProductCard.tsx
 *
 * Core customer-facing product card component.
 *
 * Connected to `useCart` hook for Quick Add:
 *  - Responsive image container with next/image
 *  - Title, Category, Price, and StockBadge
 *  - Quick Add button (+ icon) invokes `useCart().addItem()` and opens drawer without page navigation
 *  - Event isolation stops link navigation on quick add
 */

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import type { ProductWithDetails } from "@/lib/db/products";
import { Price } from "@/components/shared/Price";
import { StockBadge } from "@/components/shared/StockBadge";
import { useCart } from "@/features/storefront/hooks/useCart";
import { ROUTES } from "@/constants/routes";
import { ShoppingBag, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ProductCardProps extends React.HTMLAttributes<HTMLDivElement> {
  product: ProductWithDetails;
  /** Optional override callback when the quick-add button is clicked */
  onQuickAdd?: (product: ProductWithDetails) => void;
}

export function ProductCard({
  product,
  onQuickAdd,
  className,
  ...props
}: ProductCardProps) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = React.useState(false);

  // Determine primary image
  const primaryImage =
    product.images?.find((img) => img.is_primary) ?? product.images?.[0];
  const imageUrl = primaryImage?.url ?? null;
  const imageAlt = primaryImage?.alt_text ?? product.name;

  // Determine stock availability from product & variant status
  const isAvailable =
    product.status === "active" &&
    (product.variants?.length === 0 ||
      product.variants?.some((v) => v.status === "active"));
  const stockQuantity = isAvailable ? undefined : 0;

  const firstVariantId = product.variants?.[0]?.id;
  const productUrl = ROUTES.product(product.slug);

  const handleQuickAddClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (onQuickAdd) {
      onQuickAdd(product);
      return;
    }

    if (!firstVariantId || !isAvailable || isAdding) return;

    setIsAdding(true);
    try {
      await addItem({
        variantId: firstVariantId,
        quantity: 1,
        unitPriceSnapshot: Number(product.base_price),
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] overflow-hidden shadow-xs hover:shadow-md transition-all duration-200",
        className
      )}
      {...props}
    >
      {/* Product Image Area */}
      <Link
        href={productUrl}
        tabIndex={-1}
        className="relative aspect-4/5 w-full bg-[var(--kit-surface)] overflow-hidden block"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-[var(--kit-muted-fg)] bg-[var(--kit-muted)]/30">
            <ShoppingBag className="h-8 w-8 opacity-40" />
            <span className="text-[10px] mt-1 opacity-60">No Image</span>
          </div>
        )}

        {/* Stock Badge Overlay (Top Left) */}
        <div className="absolute top-2 left-2 z-10">
          <StockBadge quantity={stockQuantity} variant="sm" />
        </div>
      </Link>

      {/* Content Body */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {/* Category Label */}
        {product.category?.name && (
          <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--kit-muted-fg)] truncate">
            {product.category.name}
          </span>
        )}

        {/* Title Link */}
        <Link
          href={productUrl}
          className="mt-1 text-xs sm:text-sm font-semibold text-[var(--kit-text-primary)] hover:text-[var(--kit-accent)] transition-colors line-clamp-2 min-h-[2rem]"
        >
          {product.name}
        </Link>

        {/* Price & Quick Add Footer */}
        <div className="mt-auto flex items-center justify-between pt-3 gap-2">
          <Price
            amount={Number(product.base_price)}
            originalAmount={
              product.compare_at_price
                ? Number(product.compare_at_price)
                : undefined
            }
            size="sm"
          />

          {/* Quick Add Button */}
          <button
            type="button"
            onClick={handleQuickAddClick}
            aria-label={`Add ${product.name} to cart`}
            disabled={!isAvailable || isAdding}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--kit-surface)] border border-[var(--kit-border)] text-[var(--kit-text-primary)] hover:bg-[var(--kit-accent)] hover:text-[var(--kit-accent-fg)] hover:border-[var(--kit-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 min-h-[36px] min-w-[36px]"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--kit-accent)]" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
