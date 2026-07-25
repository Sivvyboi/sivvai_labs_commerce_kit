/**
 * config/index.ts
 *
 * Barrel export for the entire configuration system.
 *
 * Consumers import from "@/config" and get access to all config objects:
 *
 *   import { siteConfig, featureFlag, localizationConfig, defaultMetadata }
 *     from "@/config";
 *
 * Do NOT re-export types here to keep the barrel simple.
 * Import types directly from their source modules when needed.
 *
 * Step 6 additions:
 *   storefrontNav, announcementBanner, homepageSections, heroConfig,
 *   benefitsConfig, testimonialsConfig, promoBannerConfig, footerColumns,
 *   whatsappCheckout — from "./storefront"
 *
 *   aboutContent, contactContent, privacyContent, termsContent,
 *   shippingContent — from "./content"
 */

export { siteConfig } from "./site";
export { localizationConfig } from "./localization";
export { defaultMetadata } from "./seo";
export { featureFlag } from "./feature-flags";

// Step 6 — Storefront
export {
  storefrontNav,
  announcementBanner,
  homepageSections,
  heroConfig,
  benefitsConfig,
  testimonialsConfig,
  promoBannerConfig,
  footerColumns,
  whatsappCheckout,
} from "./storefront";

// Step 6 — Static page content
export {
  aboutContent,
  contactContent,
  privacyContent,
  termsContent,
  shippingContent,
} from "./content";
