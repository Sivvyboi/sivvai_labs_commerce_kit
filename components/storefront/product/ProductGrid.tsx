/**
 * components/storefront/product/ProductGrid.tsx
 *
 * Reusable responsive product grid container.
 * Renders ProductCard items or ProductCardSkeleton loading placeholders.
 */

import * as React from "react";
import type { ProductWithDetails } from "@/lib/db/products";
import { ProductCard } from "./ProductCard";
import { ProductCardSkeleton } from "./ProductCardSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils/cn";

export interface ProductGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Array of products to display */
  products?: ProductWithDetails[];
  /** Loading state — when true, renders skeleton cards */
  loading?: boolean;
  /** Number of skeleton cards to render when loading. Defaults to 8 */
  skeletonCount?: number;
  /** Custom column layout override */
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  /** Quick-add callback passed through to each ProductCard */
  onQuickAdd?: (product: ProductWithDetails) => void;
  /** Optional custom message when products array is empty */
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ProductGrid({
  products = [],
  loading = false,
  skeletonCount = 8,
  columns = { mobile: 2, tablet: 3, desktop: 4 },
  onQuickAdd,
  emptyTitle = "No products found",
  emptyDescription = "Try adjusting your filters or search query.",
  className,
  ...props
}: ProductGridProps) {
  // Construct grid column classes based on props or defaults
  const mobileCols = columns.mobile === 1 ? "grid-cols-1" : "grid-cols-2";
  const tabletCols =
    columns.tablet === 2
      ? "md:grid-cols-2"
      : columns.tablet === 4
        ? "md:grid-cols-4"
        : "md:grid-cols-3";
  const desktopCols =
    columns.desktop === 3
      ? "lg:grid-cols-3"
      : columns.desktop === 5
        ? "lg:grid-cols-5"
        : "lg:grid-cols-4";

  const gridLayoutClasses = cn(
    "grid gap-3 sm:gap-4 md:gap-6",
    mobileCols,
    tabletCols,
    desktopCols,
    className
  );

  // Loading State -> Skeleton Grid
  if (loading) {
    return (
      <div className={gridLayoutClasses} {...props}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Empty State -> EmptyState Component
  if (!products || products.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  // Active Product Grid
  return (
    <div className={gridLayoutClasses} {...props}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onQuickAdd={onQuickAdd}
        />
      ))}
    </div>
  );
}
