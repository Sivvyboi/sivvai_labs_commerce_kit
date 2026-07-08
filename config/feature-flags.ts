/**
 * config/featureFlag.ts
 *
 * Boolean feature toggles for progressive feature rollout.
 *
 * Each flag is driven by a NEXT_PUBLIC_* environment variable so it can be
 * toggled without a code change. The default (fallback) value is always the
 * SAFE / DISABLED state — features must be explicitly opted into.
 *
 * Rules:
 * - All flags default to `false` (safe off).
 * - Names use UPPER_SNAKE_CASE for the env var, camelCase for the flag key.
 * - Add a comment explaining what the flag gates before shipping it.
 * - Remove flags once the feature is fully GA and the toggle is no longer needed.
 */

function flag(envVar: string, defaultValue = false): boolean {
  if (typeof process.env[envVar] === "undefined") return defaultValue;
  return process.env[envVar] === "true";
}

export const featureFlag = {
  /**
   * FEATURE: User-facing authentication (sign up, sign in, sign out).
   * Enable once Supabase Auth is configured and the auth UI is built.
   */
  auth: flag("NEXT_PUBLIC_FEATURE_AUTH"),

  /**
   * FEATURE: Shopping cart and checkout flow.
   * Enable once the cart domain model and checkout pages are implemented.
   */
  cart: flag("NEXT_PUBLIC_FEATURE_CART"),

  /**
   * FEATURE: Search bar and product filtering.
   * Enable once the search index / Supabase full-text search is configured.
   */
  search: flag("NEXT_PUBLIC_FEATURE_SEARCH"),

  /**
   * FEATURE: Product reviews and ratings.
   * Enable once the reviews schema and moderation flow are built.
   */
  reviews: flag("NEXT_PUBLIC_FEATURE_REVIEWS"),

  /**
   * FEATURE: Wishlist / saved items.
   */
  wishlist: flag("NEXT_PUBLIC_FEATURE_WISHLIST"),

  /**
   * FEATURE: WhatsApp order flow integration.
   * When enabled, "Buy Now" sends a pre-filled WhatsApp message to the merchant.
   */
  whatsappCheckout: flag("NEXT_PUBLIC_FEATURE_WHATSAPP_CHECKOUT"),
} as const;

export type FeatureFlag = typeof featureFlag;
export type FeatureFlagKey = keyof FeatureFlag;
