/**
 * lib/variants/pricing.ts
 *
 * Canonical Variant and Product Pricing Resolver for Commerce Kit.
 *
 * Pricing Precedence:
 * 1. variant.price_override (if not null / undefined)
 * 2. product.sale_price (if not null / undefined)
 * 3. product.base_price
 *
 * All prices are represented and returned in minor units (kobo/cents).
 */

export interface PricingProductInput {
  base_price: number;
  sale_price?: number | null;
}

export interface PricingVariantInput {
  price_override?: number | null;
}

/**
 * Resolves the authoritative price for a product variant in minor units (kobo/cents).
 */
export function resolveVariantPrice(
  product: PricingProductInput,
  variant?: PricingVariantInput | null
): number {
  if (variant?.price_override != null) {
    return Number(variant.price_override);
  }
  if (product.sale_price != null) {
    return Number(product.sale_price);
  }
  return Number(product.base_price ?? 0);
}

/**
 * Checks if a variant or product currently has an active discount / sale price.
 */
export function isVariantOnSale(
  product: PricingProductInput,
  variant?: PricingVariantInput | null
): boolean {
  if (variant?.price_override != null) {
    return false; // Specific price override is explicit
  }
  return product.sale_price != null && product.sale_price < product.base_price;
}
