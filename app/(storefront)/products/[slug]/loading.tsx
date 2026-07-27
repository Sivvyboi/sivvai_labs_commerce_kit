/**
 * app/(storefront)/products/[slug]/loading.tsx
 *
 * Layout-matched skeleton loading state for the Product Detail Page.
 */

import { ProductCardSkeleton } from "@/components/storefront/product/ProductCardSkeleton";

export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8 space-y-8 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="h-4 w-64 bg-[var(--kit-surface)] rounded-sm" />

      {/* Main PDP Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Gallery Skeleton (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-square w-full rounded-2xl bg-[var(--kit-surface)]" />
          <div className="flex gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-[var(--kit-surface)]" />
            ))}
          </div>
        </div>

        {/* Product Details Skeleton (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <div className="h-4 w-24 bg-[var(--kit-surface)] rounded-md" />
            <div className="h-8 w-full max-w-sm bg-[var(--kit-surface)] rounded-lg" />
            <div className="h-4 w-32 bg-[var(--kit-surface)] rounded-md" />
          </div>

          <div className="h-9 w-40 bg-[var(--kit-surface)] rounded-lg" />

          <div className="space-y-3 pt-4 border-t border-[var(--kit-border)]">
            <div className="h-4 w-20 bg-[var(--kit-surface)] rounded-md" />
            <div className="flex gap-3">
              <div className="h-10 w-20 bg-[var(--kit-surface)] rounded-xl" />
              <div className="h-10 w-20 bg-[var(--kit-surface)] rounded-xl" />
              <div className="h-10 w-20 bg-[var(--kit-surface)] rounded-xl" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-4 w-16 bg-[var(--kit-surface)] rounded-md" />
            <div className="h-11 w-36 bg-[var(--kit-surface)] rounded-lg" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="h-12 bg-[var(--kit-surface)] rounded-xl" />
            <div className="h-12 bg-[var(--kit-surface)] rounded-xl" />
          </div>

          <div className="h-32 bg-[var(--kit-surface)] rounded-2xl" />
        </div>
      </div>

      {/* Related Skeleton */}
      <div className="space-y-6 pt-12 border-t border-[var(--kit-border)]">
        <div className="h-7 w-48 bg-[var(--kit-surface)] rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
