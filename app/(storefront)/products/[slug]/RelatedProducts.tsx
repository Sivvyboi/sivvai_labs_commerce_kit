/**
 * app/(storefront)/products/[slug]/RelatedProducts.tsx
 *
 * Async Server Component. Fetches and renders related products from the same category.
 * Excludes the current product.
 */

import * as productService from "@/services/product-service";
import { ProductGrid } from "@/components/storefront/product/ProductGrid";
import { featureFlag } from "@/config/feature-flags";

export interface RelatedProductsProps {
  categorySlug?: string | null;
  currentProductId: string;
}

export async function RelatedProducts({
  categorySlug,
  currentProductId,
}: RelatedProductsProps) {
  if (!featureFlag.relatedProducts) return null;

  const { data: allCategoryProducts } = await productService.getProducts({
    categorySlug: categorySlug ?? undefined,
    limit: 5,
  });

  const filteredProducts = allCategoryProducts.filter(
    (p) => p.id !== currentProductId
  ).slice(0, 4);

  if (filteredProducts.length === 0) return null;

  return (
    <section className="space-y-6 pt-12 border-t border-[var(--kit-border)]">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--kit-text-primary)]">
          You May Also Like
        </h2>
      </div>

      <ProductGrid
        products={filteredProducts}
        columns={{ mobile: 2, tablet: 3, desktop: 4 }}
      />
    </section>
  );
}
