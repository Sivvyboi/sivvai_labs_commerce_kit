/**
 * app/robots.ts
 *
 * Generates the robots.txt for the site via the Next.js MetadataRoute API.
 * Reference: node_modules/next/dist/docs/02-app/02-api-reference/04-file-conventions/robots.md
 *
 * Policy:
 *  - Production: allow public storefront crawling, disallow private/application routes.
 *  - Non-production (dev / preview): block all crawling to prevent accidental indexing.
 *
 * NOTE: robots.txt is a crawling directive, NOT a security mechanism.
 * All private routes are protected by authentication/authorization independently.
 */

import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { isProduction } from "@/config/seo";

export default function robots(): MetadataRoute.Robots {
  if (!isProduction) {
    // Block all crawling in dev / preview environments
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/account/",
          "/auth/",
          "/api/",
          "/cart",
          "/checkout/",
          "/orders/",
          "/search",
          "/showcase",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
