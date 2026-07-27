"use client";

/**
 * app/(storefront)/products/[slug]/RecentlyViewed.tsx
 *
 * Client Component. Tracks and displays recently viewed products via localStorage.
 * Capped at 12 products, newest first, deduplicated.
 * Gated by `featureFlag.recentlyViewed`.
 */

import { useEffect, useState } from "react";
import type { ProductWithDetails } from "@/lib/db/products";
import { ProductGrid } from "@/components/storefront/product/ProductGrid";
import { featureFlag } from "@/config/feature-flags";
import { History } from "lucide-react";

export interface RecentlyViewedProps {
  currentProduct: ProductWithDetails;
}

const LOCAL_STORAGE_KEY = "sivvai_recently_viewed";
const MAX_RECENT = 12;

export function RecentlyViewed({ currentProduct }: RecentlyViewedProps) {
  const [items, setItems] = useState<ProductWithDetails[]>(() => {
    if (!featureFlag.recentlyViewed || typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      const existing: ProductWithDetails[] = stored ? (JSON.parse(stored) as ProductWithDetails[]) : [];
      return existing.filter((p) => p.id !== currentProduct.id);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!featureFlag.recentlyViewed || typeof window === "undefined") return;

    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        let existing: ProductWithDetails[] = stored ? (JSON.parse(stored) as ProductWithDetails[]) : [];

        // Filter out current product, prepend current product, cap at MAX_RECENT
        existing = [
          currentProduct,
          ...existing.filter((p) => p.id !== currentProduct.id),
        ].slice(0, MAX_RECENT);

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));

        // Items to display (excluding current product)
        setItems(existing.filter((p) => p.id !== currentProduct.id));
      } catch {
        // Ignore localStorage errors
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [currentProduct]);

  if (!featureFlag.recentlyViewed || items.length === 0) return null;

  return (
    <section className="space-y-6 pt-12 border-t border-[var(--kit-border)]">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-[var(--kit-accent)]" />
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--kit-text-primary)]">
          Recently Viewed
        </h2>
      </div>

      <ProductGrid
        products={items}
        columns={{ mobile: 2, tablet: 3, desktop: 4 }}
      />
    </section>
  );
}
