/**
 * app/(storefront)/catalog/[category]/page.tsx
 *
 * Category-filtered Catalog Page — ISR Server Component.
 *
 * Features:
 *  - Resolves category by slug via categoryService.getCategoryBySlug()
 *  - Returns 404 if category not found
 *  - Fetches only published products in that category
 *  - ISR revalidation: 3600 seconds
 *  - Full SEO metadata, Breadcrumb, canonical URL
 *  - Desktop FilterPanel (category hidden), Mobile FilterDrawer
 *  - Streaming ProductGrid, Pagination, SortDropdown
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
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
import { NotFoundError } from "@/lib/errors";

export const revalidate = 3600;

export interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
    min?: string;
    max?: string;
    featured?: string;
  }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  try {
    const { category: slug } = await params;
    const category = await categoryService.getCategoryBySlug(slug);
    const title = `${category.name} — ${siteConfig.name}`;
    const description =
      category.description ??
      `Browse our collection of ${category.name} products at ${siteConfig.name}.`;
    return {
      title,
      description,
      openGraph: { title, description, url: `${siteConfig.url}/catalog/${slug}` },
      alternates: { canonical: `${siteConfig.url}/catalog/${slug}` },
    };
  } catch {
    return { title: `Category — ${siteConfig.name}` };
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { category: categorySlug } = await params;
  const resolvedSearch = await searchParams;

  // Resolve category, 404 if not found
  let category;
  try {
    category = await categoryService.getCategoryBySlug(categorySlug);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const page = Math.max(1, parseInt(resolvedSearch.page ?? "1", 10));
  const limit = 12;
  const offset = (page - 1) * limit;
  const sort = (resolvedSearch.sort as ProductSortOption) ?? "newest";
  const minPrice = resolvedSearch.min ? parseFloat(resolvedSearch.min) * 100 : undefined;
  const maxPrice = resolvedSearch.max ? parseFloat(resolvedSearch.max) * 100 : undefined;
  const featured = resolvedSearch.featured === "true" ? true : undefined;

  const [categories, { data: products, count }] = await Promise.all([
    categoryService.getCategories(),
    productService.getProducts({
      categorySlug,
      sort,
      minPrice,
      maxPrice,
      featured,
      limit,
      offset,
    }),
  ]);

  const totalPages = Math.ceil(count / limit);
  const categoryPageUrl = ROUTES.category(categorySlug);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Home", href: ROUTES.home },
          { label: "Catalog", href: ROUTES.catalog },
          { label: category.name },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--kit-border)] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--kit-text-primary)]">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-sm text-[var(--kit-muted-fg)] mt-1 max-w-lg">
              {category.description}
            </p>
          )}
          <p className="text-xs text-[var(--kit-muted-fg)] mt-1">
            {count} product{count === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <FilterDrawer categories={categories} hideCategoryFilter />
          <SortDropdown />
        </div>
      </div>

      {/* Active Filter Chips */}
      <ActiveFilters categories={categories} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="hidden lg:block lg:col-span-1">
          <FilterPanel categories={categories} hideCategoryFilter />
        </div>

        <div className="lg:col-span-3 space-y-8">
          <Suspense fallback={<ProductGrid loading skeletonCount={8} />}>
            <ProductGrid
              products={products}
              emptyTitle={`No products in ${category.name}`}
              emptyDescription="Check back soon or explore our other categories."
            />
          </Suspense>

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              basePath={categoryPageUrl}
              query={{
                sort: resolvedSearch.sort,
                min: resolvedSearch.min,
                max: resolvedSearch.max,
                featured: resolvedSearch.featured,
              }}
            />
          )}
        </div>
      </div>

      {/* JSON-LD Breadcrumb */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: siteConfig.url,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Catalog",
                item: `${siteConfig.url}/catalog`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: category.name,
                item: `${siteConfig.url}/catalog/${categorySlug}`,
              },
            ],
          }),
        }}
      />
    </div>
  );
}
