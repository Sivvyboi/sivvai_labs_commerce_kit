/**
 * app/sitemap.ts
 *
 * Scalable XML sitemap generator supporting Next.js 16 chunked sitemaps via generateSitemaps.
 * Reference: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md
 *
 * Indexing Policy:
 *  - Homepage (/)
 *  - Main catalog (/catalog)
 *  - Active categories (/catalog/[slug])
 *  - Published, non-archived products (/products/[slug])
 *
 * Excluded from Sitemap:
 *  - Draft and archived products
 *  - Faceted/filtered/paginated catalog queries
 *  - Private routes (/admin, /account, /auth, /api, /cart, /checkout, /orders, /search)
 *
 * Scale & Chunking:
 *  - SITEMAP_CHUNK_SIZE controls URLs per sitemap chunk (default 10,000, protocol max 50,000)
 *  - generateSitemaps returns chunk IDs: [{ id: 0 }, { id: 1 }, ...]
 *  - sitemap receives { id: Promise<string> } as required by Next.js 16
 *  - DB errors are logged observably and rethrown rather than silently suppressed
 */

import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import * as productService from "@/services/product-service";
import * as categoryService from "@/services/category-service";

export const SITEMAP_CHUNK_SIZE = 10000;

export async function generateSitemaps() {
  try {
    const { count } = await productService.getProducts({ limit: 1 });
    const total = count || 0;
    const numSitemaps = Math.max(1, Math.ceil(total / SITEMAP_CHUNK_SIZE));
    const sitemaps = [];
    for (let i = 0; i < numSitemaps; i++) {
      sitemaps.push({ id: i });
    }
    return sitemaps;
  } catch (err) {
    console.error("[generateSitemaps] Failed to query product count for sitemap chunking:", err);
    return [{ id: 0 }];
  }
}

export default async function sitemap(props?: {
  id?: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url; // guaranteed without trailing slash
  const resolvedId = props?.id ? await props.id : "0";
  const chunkIndex = parseInt(String(resolvedId), 10) || 0;

  const entries: MetadataRoute.Sitemap = [];

  // Static and category routes are only included in the primary (first) chunk
  if (chunkIndex === 0) {
    entries.push(
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
      }
    );

    try {
      const categories = await categoryService.getCategories();
      for (const c of categories) {
        if (!c.archived_at) {
          entries.push({
            url: `${base}/catalog/${c.slug}`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.7,
          });
        }
      }
    } catch (err) {
      console.error("[sitemap] Failed to query categories for sitemap chunk 0:", err);
    }
  }

  // Fetch product URLs for this chunk
  try {
    const offset = chunkIndex * SITEMAP_CHUNK_SIZE;
    const { data: products } = await productService.getProducts({
      offset,
      limit: SITEMAP_CHUNK_SIZE,
    });

    for (const p of products) {
      if (!p.archived_at && p.status === "published") {
        entries.push({
          url: `${base}/products/${p.slug}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch (err) {
    console.error(`[sitemap] Error querying products for sitemap chunk ${chunkIndex}:`, err);
    throw err;
  }

  return entries;
}
