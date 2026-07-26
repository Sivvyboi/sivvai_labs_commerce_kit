/**
 * components/storefront/home/FeaturedProductsSection.tsx
 *
 * Async Server Component. Homepage featured products section.
 *
 * Data Fetching:
 *  - Calls `productService.getProducts({ limit: 8 })`
 *  - Wrapped inside an independent Suspense boundary in page.tsx for streaming
 */

import Link from "next/link";
import * as productService from "@/services/product-service";
import { ProductGrid } from "@/components/storefront/product/ProductGrid";
import { ROUTES } from "@/constants/routes";
import { ArrowRight } from "lucide-react";

export async function FeaturedProductsSection() {
  const { data: products } = await productService.getProducts({ limit: 8 });

  return (
    <section className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--kit-text-primary)]">
            Featured Products
          </h2>
          <p className="text-xs sm:text-sm text-[var(--kit-muted-fg)] mt-1">
            Handpicked styles trending right now.
          </p>
        </div>

        <Link
          href={ROUTES.catalog}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--kit-accent)] hover:underline underline-offset-4 transition-all"
        >
          <span>View All Products</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Product Grid */}
      <ProductGrid products={products} />
    </section>
  );
}
