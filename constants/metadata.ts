/**
 * constants/metadata.ts
 *
 * Static string constants used across metadata, OG tags, and structured data.
 * These are purposefully kept separate from config/seo.ts because they are
 * pure string values with no logic — safe to import from any environment.
 */

import { siteConfig } from "@/config/site";
import { localizationConfig } from "@/config/localization";

/** The root `<html lang="...">` attribute value */
export const HTML_LANG = localizationConfig.defaultLocale;

/** The root `<html dir="...">` attribute value */
export const HTML_DIR = localizationConfig.isRTL ? "rtl" : "ltr";

/** Viewport meta content string for mobile-first design */
export const VIEWPORT_CONTENT =
  "width=device-width, initial-scale=1, viewport-fit=cover";

/** Twitter/X card type used by default */
export const OG_TWITTER_CARD = "summary_large_image" as const;

/** Default OG image dimensions */
export const OG_IMAGE = {
  width: 1200,
  height: 630,
} as const;

/** Robots meta default (noindex until launch) */
export const ROBOTS_DEFAULT = {
  index: false,
  follow: false,
} as const;

/** Canonical site name — use this, not siteConfig.name, in meta strings */
export const SITE_NAME = siteConfig.name;
