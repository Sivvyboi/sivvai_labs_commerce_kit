/**
 * components/storefront/filters/SortDropdown.tsx
 *
 * Client Component. Dropdown for selecting product sort order.
 * Updates searchParams while preserving page 1 and active filters.
 */

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

export function SortDropdown() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get("sort") ?? "newest";

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-select" className="sr-only">
        Sort products by
      </label>
      <div className="relative inline-flex items-center">
        <select
          id="sort-select"
          value={currentSort}
          onChange={handleSortChange}
          className="appearance-none rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] pl-3 pr-8 py-2 text-xs font-semibold text-[var(--kit-text-primary)] outline-none focus:ring-2 focus:ring-[var(--kit-accent)] focus:border-transparent min-h-[38px] cursor-pointer"
        >
          <option value="newest">Sort: Newest Arrivals</option>
          <option value="oldest">Sort: Oldest First</option>
          <option value="price-asc">Sort: Price Low → High</option>
          <option value="price-desc">Sort: Price High → Low</option>
          <option value="name-asc">Sort: Name A → Z</option>
          <option value="name-desc">Sort: Name Z → A</option>
          <option value="featured">Sort: Featured</option>
        </select>
        <ArrowUpDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[var(--kit-muted-fg)]" />
      </div>
    </div>
  );
}
