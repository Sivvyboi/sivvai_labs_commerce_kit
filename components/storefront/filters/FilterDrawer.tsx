/**
 * components/storefront/filters/FilterDrawer.tsx
 *
 * Client Component. Mobile drawer slide-over container for catalog filters.
 * Accessible with focus trap, ESC listener, and ARIA attributes.
 */

"use client";

import { useEffect, useState } from "react";
import type { CategoryRow } from "@/lib/db/categories";
import { FilterPanel } from "./FilterPanel";
import { Filter, X } from "lucide-react";

export interface FilterDrawerProps {
  categories?: CategoryRow[];
  hideCategoryFilter?: boolean;
}

export function FilterDrawer({
  categories = [],
  hideCategoryFilter = false,
}: FilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Filter Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex lg:hidden items-center justify-center gap-2 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] px-4 py-2 text-xs font-semibold text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors min-h-[44px]"
        aria-label="Open catalog filters"
      >
        <Filter className="h-4 w-4 text-[var(--kit-accent)]" />
        <span>Filters</span>
      </button>

      {/* Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-over Drawer Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-[var(--kit-bg)] p-6 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col justify-between overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Filter products"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--kit-border)] pb-4">
            <h2 className="text-base font-bold text-[var(--kit-text-primary)] flex items-center gap-2">
              <Filter className="h-4 w-4 text-[var(--kit-accent)]" />
              <span>Filter Products</span>
            </h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-[var(--kit-muted-fg)] hover:bg-[var(--kit-surface)] hover:text-[var(--kit-text-primary)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close filters"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <FilterPanel
            categories={categories}
            hideCategoryFilter={hideCategoryFilter}
          />
        </div>

        <div className="pt-6 border-t border-[var(--kit-border)] mt-auto">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full rounded-xl bg-[var(--kit-accent)] py-3 text-xs font-bold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[44px]"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </>
  );
}
