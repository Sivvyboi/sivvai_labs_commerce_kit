/**
 * components/storefront/product/ProductCardSkeleton.tsx
 *
 * Animated loading skeleton matching ProductCard dimensions.
 * Uses the UI Skeleton primitive.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

export type ProductCardSkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function ProductCardSkeleton({ className, ...props }: ProductCardSkeletonProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] overflow-hidden shadow-xs",
        className
      )}
      {...props}
    >
      {/* Image Aspect Ratio Skeleton (4:5 aspect ratio) */}
      <div className="relative aspect-4/5 w-full bg-[var(--kit-surface)] overflow-hidden">
        <Skeleton className="h-full w-full" />
      </div>

      {/* Content Details Skeleton */}
      <div className="flex flex-1 flex-col p-3 sm:p-4 space-y-3">
        {/* Category & Badge */}
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>

        {/* Product Title Skeleton */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />

        {/* Price & Quick Add Action Skeleton */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
