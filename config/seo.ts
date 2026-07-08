/**
 * config/seo.ts
 *
 * Default SEO and Open Graph metadata applied to every page unless
 * a specific page or layout overrides it via Next.js `export const metadata`.
 *
 * This file is consumed by app/layout.tsx and used as the base for the
 * `generateMetadata` pattern in individual page files.
 *
 * Reference: Next.js 16 Metadata API
 * → node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md
 */

import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

/**
 * The base metadata object exported from the root layout.
 * Individual pages extend this via `generateMetadata` or static `metadata`.
 */
export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),

  title: {
    /**
     * `template` is applied to all child pages: "Page Title | Store Name"
     * `default` is used on the root "/" page only.
     */
    template: `%s | ${siteConfig.name}`,
    default: siteConfig.name,
  },

  description: siteConfig.tagline,

  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: {
      template: `%s | ${siteConfig.name}`,
      default: siteConfig.name,
    },
    description: siteConfig.tagline,
    // Add /public/images/og-default.jpg when you have brand assets
    // images: [{ url: "/images/og-default.jpg", width: 1200, height: 630 }],
  },

  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.tagline,
  },

  robots: {
    // Disallow indexing until the storefront is publicly launched.
    // Flip both to `true` before going live.
    index: false,
    follow: false,
  },
} as const;

export type DefaultMetadata = typeof defaultMetadata;
