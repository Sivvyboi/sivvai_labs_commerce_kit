/**
 * features/storefront/utils/buildBreadcrumbSchema.ts
 *
 * Generates Schema.org BreadcrumbList structured data for search engine indexers.
 */

import { siteConfig } from "@/config/site";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function buildBreadcrumbSchema(
  items: BreadcrumbItem[],
  baseUrl: string = siteConfig.url
) {
  const cleanBase = baseUrl.replace(/\/+$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      let itemUrl: string | undefined;
      if (item.href) {
        itemUrl = item.href.startsWith("http")
          ? item.href
          : `${cleanBase}${item.href.startsWith("/") ? item.href : `/${item.href}`}`;
      }

      return {
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
        ...(itemUrl ? { item: itemUrl } : {}),
      };
    }),
  };
}
