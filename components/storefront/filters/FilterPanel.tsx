/**
 * components/storefront/filters/FilterPanel.tsx
 *
 * Client Component. Desktop sidebar filter panel for catalog & category pages.
 * Directly manages URL searchParams without local state duplication.
 */

"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CategoryRow } from "@/lib/db/categories";
import { Filter, Check } from "lucide-react";

export interface FilterPanelProps {
  categories?: CategoryRow[];
  hideCategoryFilter?: boolean;
}

export function FilterPanel({
  categories = [],
  hideCategoryFilter = false,
}: FilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Active values from searchParams
  const selectedCategory = searchParams.get("category") ?? "";
  const minPriceParam = searchParams.get("min") ?? "";
  const maxPriceParam = searchParams.get("max") ?? "";
  const isFeaturedOnly = searchParams.get("featured") === "true";

  // Local state for price inputs before submission/blur
  const [minInput, setMinInput] = useState(minPriceParam);
  const [maxInput, setMaxInput] = useState(maxPriceParam);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    params.set("page", "1"); // Reset to first page
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCategorySelect = (slug: string) => {
    if (selectedCategory === slug) {
      updateParams({ category: null });
    } else {
      updateParams({ category: slug });
    }
  };

  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({
      min: minInput || null,
      max: maxInput || null,
    });
  };

  const handleFeaturedToggle = () => {
    updateParams({ featured: isFeaturedOnly ? null : "true" });
  };

  return (
    <aside className="w-full space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--kit-border)] pb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--kit-accent)]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--kit-text-primary)]">
            Filters
          </h2>
        </div>
      </div>

      {/* Category Section */}
      {!hideCategoryFilter && categories.length > 0 && (
        <div className="space-y-3 border-b border-[var(--kit-border)] pb-5">
          <h3 className="text-xs font-bold uppercase text-[var(--kit-muted-fg)]">
            Categories
          </h3>
          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => updateParams({ category: null })}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                !selectedCategory
                  ? "bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] font-semibold"
                  : "text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)]"
              }`}
            >
              <span>All Categories</span>
              {!selectedCategory && <Check className="h-3.5 w-3.5" />}
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.slug)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    isSelected
                      ? "bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] font-semibold"
                      : "text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)]"
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Range Filter Form */}
      <form onSubmit={handlePriceApply} className="space-y-3 border-b border-[var(--kit-border)] pb-5">
        <h3 className="text-xs font-bold uppercase text-[var(--kit-muted-fg)]">
          Price Range (₦)
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label htmlFor="min-price-input" className="sr-only">
              Minimum Price
            </label>
            <input
              id="min-price-input"
              type="number"
              min="0"
              placeholder="Min"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              className="w-full rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] px-3 py-1.5 text-xs text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] outline-none focus:ring-1 focus:ring-[var(--kit-accent)]"
            />
          </div>
          <span className="text-xs text-[var(--kit-muted-fg)]">-</span>
          <div className="flex-1">
            <label htmlFor="max-price-input" className="sr-only">
              Maximum Price
            </label>
            <input
              id="max-price-input"
              type="number"
              min="0"
              placeholder="Max"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              className="w-full rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] px-3 py-1.5 text-xs text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] outline-none focus:ring-1 focus:ring-[var(--kit-accent)]"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--kit-surface)] border border-[var(--kit-border)] px-3 py-1.5 text-xs font-semibold text-[var(--kit-text-primary)] hover:bg-[var(--kit-border)] transition-colors"
        >
          Apply Price
        </button>
      </form>

      {/* Featured Only Toggle */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-medium text-[var(--kit-text-primary)]">
          Featured Only
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isFeaturedOnly}
          onClick={handleFeaturedToggle}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] ${
            isFeaturedOnly ? "bg-[var(--kit-accent)]" : "bg-[var(--kit-border)]"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
              isFeaturedOnly ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </aside>
  );
}
