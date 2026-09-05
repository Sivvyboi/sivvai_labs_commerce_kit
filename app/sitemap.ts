/**
 * app/sitemap.ts
 *
 * Dynamic XML sitemap generated at request time via the Next.js MetadataRoute API.
 * Reference: node_modules/next/dist/docs/02-app/02-api-reference/04-file-conventions/sitemap.md
 *
 * Included URLs (canonical, indexable only):
 *   /                      — homepage
 *   /catalog               — main catalog
 *   /catalog/[slug]        — one entry per active category
 *   /products/[slug]       — one entry per published, non-archived product
 *
 * Excluded:
 *   - Draft products (status !== 'published')
 *   - Archived products (archived_at IS NOT NULL)
 *   - Filtered/paginated catalog variants (/catalog?page=2, /catalog?sort=...)
 *   - All private/application routes (/account, /auth, /cart, /checkout, /orders, /admin, /api)
 *   - /search, /showcase
 *
 * Scale note: this file produces a single sitemap with all published products.
 * When the catalog exceeds ~50,000 URLs or 50 MB, split into multiple sitemaps
 * using generateSitemaps() from the Next.js Metadata API and a sitemap index.
 */

import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import * as productService from "@/services/product-service";
import * as categoryService from "@/services/category-service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url; // guaranteed no trailing slash

  // ── Static routes ──────────────────────────────────────────────────────────
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/catalog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // ── Category routes ────────────────────────────────────────────────────────
  let categoryEntries: MetadataRoute.Sitemap = [];
  try {
    const categories = await categoryService.getCategories();
    categoryEntries = categories
      .filter((c) => !c.archived_at) // exclude archived categories
      .map((c) => ({
        url: `${base}/catalog/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
  } catch {
    // Non-fatal: sitemap still works without category entries
  }

  // ── Product routes ─────────────────────────────────────────────────────────
  // getProducts already filters status = 'published' and archived_at IS NULL.
  // We fetch all published products (no limit) for the sitemap.
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const { data: products } = await productService.getProducts({
      limit: 50000, // sitemap protocol cap; well above any realistic catalog size
    });
    productEntries = products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // Non-fatal: sitemap still works without product entries
  }

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
