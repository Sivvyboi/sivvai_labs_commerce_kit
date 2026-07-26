/**
 * app/(storefront)/search/page.tsx
 *
 * Full-text Product Search Results Page — Server Component.
 *
 * Features:
 *  - No caching (dynamic) — search results are always fresh
 *  - Fetches products filtered by `q` (search term)
 *  - Supports sort, price range, category filter, pagination
 *  - Full SEO metadata with noindex when query is empty
 *  - Breadcrumb, FilterPanel (desktop), FilterDrawer (mobile)
 *  - Streaming ProductGrid + Pagination
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import * as productService from "@/services/product-service";
import * as categoryService from "@/services/category-service";
import type { ProductSortOption } from "@/lib/db/products";
import { siteConfig } from "@/config/site";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { ProductGrid } from "@/components/storefront/product/ProductGrid";
import { Pagination } from "@/components/shared/Pagination";
import { FilterPanel } from "@/components/storefront/filters/FilterPanel";
import { FilterDrawer } from "@/components/storefront/filters/FilterDrawer";
import { SortDropdown } from "@/components/storefront/filters/SortDropdown";
import { ActiveFilters } from "@/components/storefront/filters/ActiveFilters";
import { ROUTES } from "@/constants/routes";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

export interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    min?: string;
    max?: string;
    category?: string;
    featured?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (!query) {
    return {
      title: `Search — ${siteConfig.name}`,
      robots: { index: false },
    };
  }

  const title = `"${query}" — Search Results — ${siteConfig.name}`;
  const description = `Browse search results for "${query}" on ${siteConfig.name}.`;

  return {
    title,
    description,
    robots: { index: false }, // Search results pages are typically noindex
    openGraph: { title, description },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearch = await searchParams;

  const query = resolvedSearch.q?.trim() ?? "";
  const page = Math.max(1, parseInt(resolvedSearch.page ?? "1", 10));
  const limit = 12;
  const offset = (page - 1) * limit;
  const sort = (resolvedSearch.sort as ProductSortOption) ?? "newest";
  const minPrice = resolvedSearch.min ? parseFloat(resolvedSearch.min) * 100 : undefined;
  const maxPrice = resolvedSearch.max ? parseFloat(resolvedSearch.max) * 100 : undefined;
  const featured = resolvedSearch.featured === "true" ? true : undefined;
  const categorySlug = resolvedSearch.category || undefined;

  const [categories, { data: products, count }] = await Promise.all([
    categoryService.getCategories(),
    query
      ? productService.getProducts({
          search: query,
          categorySlug,
          sort,
          minPrice,
          maxPrice,
          featured,
          limit,
          offset,
        })
      : Promise.resolve({ data: [], count: 0 }),
  ]);

  const totalPages = Math.ceil(count / limit);

  const headingText = query
    ? `Results for "${query}"`
    : "Search Products";

  const resultCountText = query
    ? `${count} result${count === 1 ? "" : "s"}`
    : "Enter a search term to find products.";

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Home", href: ROUTES.home },
          { label: "Search" },
        ]}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--kit-border)] pb-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--kit-accent)]/10 text-[var(--kit-accent)]">
            <Search className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--kit-text-primary)]">
              {headingText}
            </h1>
            <p className="text-xs text-[var(--kit-muted-fg)] mt-1">
              {resultCountText}
            </p>
          </div>
        </div>

        {query && (
          <div className="flex items-center gap-3">
            <FilterDrawer categories={categories} />
            <SortDropdown />
          </div>
        )}
      </div>

      {/* Empty Query State */}
      {!query && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kit-surface)] text-[var(--kit-muted-fg)]">
            <Search className="h-8 w-8" />
          </div>
          <p className="text-base font-medium text-[var(--kit-text-secondary)]">
            Use the search bar above to find products.
          </p>
        </div>
      )}

      {/* Results */}
      {query && (
        <>
          {/* Active Filters */}
          <ActiveFilters categories={categories} />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Desktop Filter Panel */}
            <div className="hidden lg:block lg:col-span-1">
              <FilterPanel categories={categories} />
            </div>

            {/* Product Grid + Pagination */}
            <div className="lg:col-span-3 space-y-8">
              <Suspense fallback={<ProductGrid loading skeletonCount={8} />}>
                <ProductGrid
                  products={products}
                  emptyTitle={`No results for "${query}"`}
                  emptyDescription="Try different keywords, check your spelling, or adjust your filters."
                />
              </Suspense>

              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  basePath={ROUTES.search}
                  query={{
                    q: query,
                    sort: resolvedSearch.sort,
                    category: resolvedSearch.category,
                    min: resolvedSearch.min,
                    max: resolvedSearch.max,
                    featured: resolvedSearch.featured,
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
