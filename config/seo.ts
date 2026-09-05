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
 * Evaluates whether the environment is a true production deployment.
 * Protects preview, staging, and dev environments from accidental search engine indexing.
 */
export function checkIsProduction(env: Record<string, string | undefined> = process.env): boolean {
  if (env.NODE_ENV !== "production") return false;

  // Vercel deployment environment detection
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "production") return false;
  if (env.NEXT_PUBLIC_VERCEL_ENV && env.NEXT_PUBLIC_VERCEL_ENV !== "production") return false;

  // Generic app environment flags
  if (env.APP_ENV && env.APP_ENV !== "production") return false;
  if (env.ENVIRONMENT && env.ENVIRONMENT !== "production") return false;

  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return false;
  if (siteUrl.includes("localhost") || siteUrl.includes("127.0.0.1")) return false;

  // Vercel preview domain heuristic
  if (siteUrl.includes(".vercel.app") && env.VERCEL_ENV !== "production") return false;

  return true;
}

const isProduction = checkIsProduction(process.env);

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

  /**
   * Environment-aware robots policy.
   * Production → allow indexing.
   * Development / preview → block indexing to prevent accidental crawling.
   */
  robots: {
    index: isProduction,
    follow: isProduction,
    googleBot: {
      index: isProduction,
      follow: isProduction,
    },
  },
} as const;

export { isProduction };

export type DefaultMetadata = typeof defaultMetadata;
