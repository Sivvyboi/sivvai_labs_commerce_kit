/**
 * features/storefront/utils/buildProductSchema.ts
 *
 * Constructs structured Schema.org JSON-LD data object for a product or product group.
 * Supports Google Rich Results for Products:
 *  - Standard `@type: "Product"` for simple products (no option groups, single default variant with {})
 *  - Schema.org `@type: "ProductGroup"` for true multi-variant products with schema-valid variesBy
 */

import type { ProductWithDetails } from "@/lib/db/products";
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

  const hasConfiguredOptions = Boolean(
    product.option_groups &&
    product.option_groups.some((g) => g.name?.trim() && g.values && g.values.length > 0)
  );

  // A simple product has no option groups and at most 1 variant with empty combination {}
  const isSimple =
    !hasConfiguredOptions &&
    (activeVariants.length <= 1 &&
      (!activeVariants[0]?.option_combination ||
        Object.keys(activeVariants[0].option_combination as object).length === 0));

  // ── 1. Simple Product Schema (@type: "Product") ─────────────────────────────
  if (isSimple) {
    const singleVariant = activeVariants[0] ?? null;
    const unitPriceMinor = resolveVariantPrice(product, singleVariant);
    const priceAmount = (unitPriceMinor / 100).toFixed(2);
    const availableStock = singleVariant ? getVariantAvailableStock(singleVariant) : undefined;
    const isAvailable =
      product.status === "published" &&
      !product.archived_at &&
      (availableStock === undefined ? true : availableStock > 0);

    let variantImageUrl: string | undefined;
    if (singleVariant?.image_id && product.images) {
      const found = product.images.find((img) => img.id === singleVariant.image_id);
      if (found?.url) {
        variantImageUrl = found.url;
      }
    }
    if (!variantImageUrl && productImages.length > 0) {
      variantImageUrl = productImages[0];
    }

    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description ?? undefined,
      image: variantImageUrl ? [variantImageUrl] : (productImages.length > 0 ? productImages : undefined),
      sku: singleVariant?.sku ?? product.id,
      brand: {
        "@type": "Brand",
        name: siteConfig.name,
      },
      offers: {
        "@type": "Offer",
        url: canonicalUrl,
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

  // ── 2. Multi-Variant ProductGroup Schema (@type: "ProductGroup") ──────────
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

  // Use schema.org properties for standard dimensions; use text names for others (not arbitrary fake URLs)
  const variesBy = Array.from(optionKeys).map((name) => {
    const lower = name.toLowerCase();
    if (lower === "color" || lower === "colour") return "https://schema.org/color";
    if (lower === "size") return "https://schema.org/size";
    return name.trim();
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
      image: variantImageUrl ? [variantImageUrl] : (productImages.length > 0 ? productImages : undefined),
      isVariantOf: {
        "@type": "ProductGroup",
        productGroupID: product.id,
      },
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
