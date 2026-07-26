/**
 * app/(storefront)/catalog/page.tsx
 *
 * Storefront Catalog Page — Dynamic Server Component.
 *
 * Features:
 *  - Reads searchParams: page, sort, category, featured, min, max, q
 *  - Calls productService.getProducts() and categoryService.getCategories()
 *  - Responsive 2-col (mobile) / 3-col (tablet) / 4-col (desktop) layout
 *  - Desktop sidebar (FilterPanel) & Mobile drawer (FilterDrawer)
 *  - Breadcrumb, ActiveFilters, SortDropdown, ProductGrid, Pagination, EmptyState
 *  - Full SEO metadata & canonical URL
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
import { ActiveFilters } from "@/components/storefront/filters/ActiveFilters";
import { FilterPanel } from "@/components/storefront/filters/FilterPanel";
import { FilterDrawer } from "@/components/storefront/filters/FilterDrawer";
import { SortDropdown } from "@/components/storefront/filters/SortDropdown";
import { ROUTES } from "@/constants/routes";

export const dynamic = "force-dynamic";

export interface CatalogPageProps {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    category?: string;
    featured?: string;
    min?: string;
    max?: string;
    q?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: CatalogPageProps): Promise<Metadata> {
  const params = await searchParams;
  const categorySlug = params.category;
  const query = params.q;

  let title = `All Products — ${siteConfig.name}`;
  if (categorySlug) {
    title = `${categorySlug.replace(/-/g, " ").toUpperCase()} — ${siteConfig.name}`;
  } else if (query) {
    title = `Search: "${query}" — ${siteConfig.name}`;
  }

  return {
    title,
    description: `Explore our collection of published products at ${siteConfig.name}.`,
    openGraph: {
      title,
      description: `Explore our collection of published products at ${siteConfig.name}.`,
      url: `${siteConfig.url}/catalog`,
    },
    alternates: {
      canonical: `${siteConfig.url}/catalog`,
    },
  };
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const resolvedParams = await searchParams;

  const page = Math.max(1, parseInt(resolvedParams.page ?? "1", 10));
  const limit = 12;
  const offset = (page - 1) * limit;

  const categorySlug = resolvedParams.category;
  const featured = resolvedParams.featured === "true" ? true : undefined;
  const minPrice = resolvedParams.min ? parseFloat(resolvedParams.min) * 100 : undefined; // Convert Naira to minor units (kobo)
  const maxPrice = resolvedParams.max ? parseFloat(resolvedParams.max) * 100 : undefined;
  const sort = (resolvedParams.sort as ProductSortOption) ?? "newest";
  const search = resolvedParams.q;

  // Parallel data fetching
  const [categories, { data: products, count }] = await Promise.all([
    categoryService.getCategories(),
    productService.getProducts({
      categorySlug,
      featured,
      minPrice,
      maxPrice,
      sort,
      search,
      limit,
      offset,
    }),
  ]);

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: "Home", href: ROUTES.home },
          { label: "Catalog" },
        ]}
      />

      {/* Catalog Title & Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--kit-border)] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--kit-text-primary)]">
            Shop Catalog
          </h1>
          <p className="text-xs sm:text-sm text-[var(--kit-muted-fg)] mt-1">
            Showing {products.length} of {count} product{count === 1 ? "" : "s"}
          </p>
        </div>

        {/* Mobile Filter Drawer + Sort Dropdown */}
        <div className="flex items-center gap-3">
          <FilterDrawer categories={categories} />
          <SortDropdown />
        </div>
      </div>

      {/* Active Filter Chips */}
      <ActiveFilters categories={categories} />

      {/* Main Grid & Desktop Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sidebar (1 column) */}
        <div className="hidden lg:block lg:col-span-1">
          <FilterPanel categories={categories} />
        </div>

        {/* Product Grid Area (3 columns on desktop) */}
        <div className="lg:col-span-3 space-y-8">
          <Suspense fallback={<ProductGrid loading skeletonCount={8} />}>
            <ProductGrid
              products={products}
              emptyTitle="No products found"
              emptyDescription="Try adjusting your price range or category filter."
            />
          </Suspense>

          {/* Numbered Pagination — preserves active filters on page change */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              basePath={ROUTES.catalog}
              query={{
                sort: resolvedParams.sort,
                category: resolvedParams.category,
                featured: resolvedParams.featured,
                min: resolvedParams.min,
                max: resolvedParams.max,
                q: resolvedParams.q,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
