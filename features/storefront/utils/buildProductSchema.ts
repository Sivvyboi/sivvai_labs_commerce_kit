/**
 * features/storefront/utils/buildProductSchema.ts
 *
 * Constructs structured Schema.org JSON-LD data object for a product.
 * Supports SEO indexers (Google Rich Results for Products).
 */

import type { ProductWithDetails } from "@/lib/db/products";
import { siteConfig } from "@/config/site";
import { localizationConfig } from "@/config/localization";

export function buildProductSchema(product: ProductWithDetails, currentUrl?: string) {
  const images = product.images?.map((img) => img.url).filter(Boolean) ?? [];
  const primaryVariant = product.variants?.find((v) => v.is_default) ?? product.variants?.[0];
  const price = primaryVariant?.price_override ?? product.base_price;
  
  // Convert price from minor units (kobo/cents) if applicable or format properly (e.g. 500000 -> 5000)
  const priceAmount = (price / 100).toFixed(2);
  
  const isAvailable =
    product.status === "published" &&
    (product.variants?.length === 0 ||
      product.variants?.some((v) => v.status === "active"));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: images.length > 0 ? images : undefined,
    sku: primaryVariant?.sku ?? product.id,
    brand: {
      "@type": "Brand",
      name: siteConfig.name,
    },
    offers: {
      "@type": "Offer",
      url: currentUrl ?? `${siteConfig.url}/products/${product.slug}`,
      priceCurrency: localizationConfig.currency,
      price: priceAmount,
      availability: isAvailable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: siteConfig.name,
      },
    },
  };
}
