/**
 * features/storefront/utils/buildProductSchema.ts
 *
 * Constructs structured Schema.org JSON-LD data object for a product or product group.
 * Supports Google Rich Results for Products, including multi-variant ProductGroup specifications.
 */

import type { ProductWithDetails, ProductVariantRow } from "@/lib/db/products";
import { siteConfig } from "@/config/site";
import { localizationConfig } from "@/config/localization";
import { resolveVariantPrice } from "@/lib/variants/pricing";
import { getVariantAvailableStock } from "@/features/storefront/utils/formatStockStatus";

export function buildProductSchema(product: ProductWithDetails, currentUrl?: string) {
  const canonicalUrl = currentUrl ?? `${siteConfig.url}/products/${product.slug}`;
  const productImages = product.images?.map((img) => img.url).filter(Boolean) ?? [];

  const activeVariants = (product.variants ?? []).filter(
    (v) => v.status === "active" && !v.archived_at
  );

  // If the product has multiple variants or explicit variant configuration, output Schema.org ProductGroup
  if (activeVariants.length > 0) {
    const optionKeys = new Set<string>();
    if (product.option_groups && product.option_groups.length > 0) {
      product.option_groups.forEach((g) => {
        if (g.name?.trim()) optionKeys.add(g.name.trim());
      });
    } else {
      activeVariants.forEach((v) => {
        if (v.option_combination && typeof v.option_combination === "object") {
          Object.keys(v.option_combination).forEach((key) => {
            if (key.trim()) optionKeys.add(key.trim());
          });
        }
      });
    }

    const variesBy = Array.from(optionKeys).map((name) => {
      const lower = name.toLowerCase();
      if (lower === "color" || lower === "colour") return "https://schema.org/color";
      if (lower === "size") return "https://schema.org/size";
      return `https://schema.org/${encodeURIComponent(name)}`;
    });

    const hasVariant = activeVariants.map((variant) => {
      let variantName = product.name;
      if (variant.option_combination && typeof variant.option_combination === "object") {
        const values = Object.values(variant.option_combination).filter(Boolean);
        if (values.length > 0) {
          variantName = `${product.name} – ${values.join(" / ")}`;
        }
      }

      let variantImageUrl: string | undefined;
      if (variant.image_id && product.images) {
        const found = product.images.find((img) => img.id === variant.image_id);
        if (found?.url) {
          variantImageUrl = found.url;
        }
      }
      if (!variantImageUrl && productImages.length > 0) {
        variantImageUrl = productImages[0];
      }

      const unitPriceMinor = resolveVariantPrice(product, variant);
      const priceAmount = (unitPriceMinor / 100).toFixed(2);
      const availableStock = getVariantAvailableStock(variant);
      const isAvailable = availableStock === undefined ? true : availableStock > 0;

      return {
        "@type": "Product",
        name: variantName,
        sku: variant.sku ?? `${product.id}-${variant.id}`,
        image: variantImageUrl ?? (productImages.length > 0 ? productImages : undefined),
        offers: {
          "@type": "Offer",
          url: `${canonicalUrl}?variant=${variant.id}`,
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
    });

    return {
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      name: product.name,
      description: product.description ?? undefined,
      productGroupID: product.id,
      url: canonicalUrl,
      brand: {
        "@type": "Brand",
        name: siteConfig.name,
      },
      ...(variesBy.length > 0 ? { variesBy } : {}),
      hasVariant,
    };
  }

  // Fallback for variantless / inactive products: standard Product
  const priceMinor = resolveVariantPrice(product, null);
  const priceAmount = (priceMinor / 100).toFixed(2);
  const isPublished = product.status === "published" && !product.archived_at;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: productImages.length > 0 ? productImages : undefined,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: siteConfig.name,
    },
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: localizationConfig.currency,
      price: priceAmount,
      availability: isPublished
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
