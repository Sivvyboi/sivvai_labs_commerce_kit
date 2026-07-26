/**
 * app/(storefront)/catalog/[category]/loading.tsx
 *
 * Category Page Loading Boundary.
 */

import { ProductCardSkeleton } from "@/components/storefront/product/ProductCardSkeleton";

export default function CategoryLoading() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 animate-pulse">
      <div className="h-4 w-48 bg-[var(--kit-surface)] rounded-sm" />
      <div className="flex justify-between items-end border-b border-[var(--kit-border)] pb-4">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-[var(--kit-surface)] rounded-md" />
          <div className="h-4 w-32 bg-[var(--kit-surface)] rounded-md" />
        </div>
        <div className="h-10 w-36 bg-[var(--kit-surface)] rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="hidden lg:block lg:col-span-1 space-y-4">
          <div className="h-56 bg-[var(--kit-surface)] rounded-2xl" />
        </div>
        <div className="lg:col-span-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
