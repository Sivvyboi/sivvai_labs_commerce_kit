/**
 * components/storefront/filters/ActiveFilters.tsx
 *
 * Client Component. Displays active filter chips with removal buttons.
 * Updates searchParams on removal while preserving remaining filters.
 */

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CategoryRow } from "@/lib/db/categories";
import { X, RotateCcw } from "lucide-react";

export interface ActiveFiltersProps {
  categories?: CategoryRow[];
}

export function ActiveFilters({ categories = [] }: ActiveFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Extract active filters
  const currentCategorySlug = searchParams.get("category");
  const minPrice = searchParams.get("min");
  const maxPrice = searchParams.get("max");
  const featured = searchParams.get("featured");
  const query = searchParams.get("q");

  const categoryName = currentCategorySlug
    ? categories.find((c) => c.slug === currentCategorySlug)?.name ?? currentCategorySlug
    : null;

  const hasActiveFilters =
    Boolean(currentCategorySlug) ||
    Boolean(minPrice) ||
    Boolean(maxPrice) ||
    Boolean(featured) ||
    Boolean(query);

  if (!hasActiveFilters) {
    return null;
  }

  const removeFilter = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.set("page", "1"); // Reset to page 1
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAllFilters = () => {
    router.push(pathname);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-3" aria-label="Active filters">
      <span className="text-xs font-semibold text-[var(--kit-muted-fg)] mr-1">
        Active Filters:
      </span>

      {/* Query chip */}
      {query && (
        <button
          type="button"
          onClick={() => removeFilter("q")}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--kit-accent)]/10 px-3 py-1 text-xs font-medium text-[var(--kit-accent)] border border-[var(--kit-accent)]/20 hover:bg-[var(--kit-accent)]/20 transition-colors"
        >
          <span>Search: &ldquo;{query}&rdquo;</span>
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Category chip */}
      {categoryName && (
        <button
          type="button"
          onClick={() => removeFilter("category")}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--kit-surface)] px-3 py-1 text-xs font-medium text-[var(--kit-text-primary)] border border-[var(--kit-border)] hover:bg-[var(--kit-border)] transition-colors"
        >
          <span>Category: {categoryName}</span>
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Price min chip */}
      {minPrice && (
        <button
          type="button"
          onClick={() => removeFilter("min")}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--kit-surface)] px-3 py-1 text-xs font-medium text-[var(--kit-text-primary)] border border-[var(--kit-border)] hover:bg-[var(--kit-border)] transition-colors"
        >
          <span>Min: ₦{Number(minPrice).toLocaleString()}</span>
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Price max chip */}
      {maxPrice && (
        <button
          type="button"
          onClick={() => removeFilter("max")}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--kit-surface)] px-3 py-1 text-xs font-medium text-[var(--kit-text-primary)] border border-[var(--kit-border)] hover:bg-[var(--kit-border)] transition-colors"
        >
          <span>Max: ₦{Number(maxPrice).toLocaleString()}</span>
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Featured chip */}
      {featured === "true" && (
        <button
          type="button"
          onClick={() => removeFilter("featured")}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--kit-surface)] px-3 py-1 text-xs font-medium text-[var(--kit-text-primary)] border border-[var(--kit-border)] hover:bg-[var(--kit-border)] transition-colors"
        >
          <span>Featured Only</span>
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Clear All */}
      <button
        type="button"
        onClick={clearAllFilters}
        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--kit-muted-fg)] hover:text-[var(--kit-accent)] transition-colors ml-auto underline underline-offset-2"
      >
        <RotateCcw className="h-3 w-3" />
        <span>Clear All</span>
      </button>
    </div>
  );
}
