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
 */

export { siteConfig } from "./site";
export { localizationConfig } from "./localization";
export { defaultMetadata } from "./seo";
export { featureFlag } from "./feature-flags";
