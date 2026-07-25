/**
 * components/shared/Rating.tsx
 *
 * Reusable star rating indicator with review count support.
 * Automatically checks `featureFlag.reviews` — returns `null` when reviews are disabled.
 */

import * as React from "react";
import { featureFlag } from "@/config/feature-flags";
import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface RatingProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Numeric rating score (0 to 5) */
  rating: number;
  /** Optional total review count */
  reviewCount?: number;
  /** Star size variant */
  size?: "sm" | "md" | "lg";
}

const iconSizes = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const textSizes = {
  sm: "text-xs",
  md: "text-xs sm:text-sm",
  lg: "text-sm sm:text-base",
};

export function Rating({
  rating,
  reviewCount,
  size = "md",
  className,
  ...props
}: RatingProps) {
  // Feature flag check — if reviews are disabled globally, hide the component
  if (!featureFlag.reviews) {
    return null;
  }

  const clampedRating = Math.min(5, Math.max(0, rating));
  const fullStars = Math.floor(clampedRating);
  const hasHalfStar = clampedRating % 1 >= 0.25 && clampedRating % 1 < 0.75;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div
      className={cn("inline-flex items-center gap-1 text-[var(--kit-warning)]", className)}
      aria-label={`Rated ${clampedRating} out of 5 stars${reviewCount ? ` across ${reviewCount} reviews` : ""}`}
      {...props}
    >
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {/* Full Stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className={cn(iconSizes[size], "fill-current")}
          />
        ))}

        {/* Half Star */}
        {hasHalfStar && (
          <StarHalf className={cn(iconSizes[size], "fill-current")} />
        )}

        {/* Empty Stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={cn(iconSizes[size], "text-[var(--kit-border)] fill-none")}
          />
        ))}
      </div>

      {/* Review Count Label */}
      {reviewCount !== undefined && (
        <span className={cn(textSizes[size], "text-[var(--kit-muted-fg)] font-medium ml-1")}>
          ({reviewCount})
        </span>
      )}
    </div>
  );
}
