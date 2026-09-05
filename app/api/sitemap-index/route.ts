/**
 * app/api/sitemap-index/route.ts
 *
 * Canonical Sitemap Index endpoint conforming to the Sitemaps XML protocol.
 * Next.js 16 chunked sitemaps generated via generateSitemaps() in app/sitemap.ts
 * are served at /sitemap/{id}.xml.
 *
 * This endpoint serves the authoritative root index at /sitemap.xml (via rewrite),
 * returning a valid <sitemapindex> that references all active sitemap chunks.
 */

import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { generateSitemaps } from "@/app/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  const sitemaps = await generateSitemaps();
  const base = siteConfig.url;
  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (s) => `  <sitemap>
    <loc>${base}/sitemap/${s.id}.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`
  )
  .join("\n")}
</sitemapindex>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
