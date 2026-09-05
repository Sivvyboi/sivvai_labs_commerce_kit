/**
 * components/shared/Breadcrumb.tsx
 *
 * Accessible Breadcrumb component — Server Component.
 *
 * Renders:
 *  1. Semantic `<nav aria-label="Breadcrumb"><ol>...</ol></nav>` HTML
 *  2. Inline JSON-LD Schema (`application/ld+json`) for Search Engines
 */

import Link from "next/link";
import { siteConfig } from "@/config/site";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { buildBreadcrumbSchema } from "@/features/storefront/utils/buildBreadcrumbSchema";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export function Breadcrumb({
  items,
  showHome = true,
  className,
  ...props
}: BreadcrumbProps) {
  // Construct complete item list including Home if requested
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: "Home", href: "/" }, ...items]
    : items;

  // Build JSON-LD BreadcrumbList Schema using centralized utility
  const jsonLd = buildBreadcrumbSchema(allItems);

  return (
    <>
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Semantic Navigation Strip */}
      <nav
        aria-label="Breadcrumb"
        className={cn("flex items-center text-xs text-[var(--kit-muted-fg)]", className)}
        {...props}
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          {allItems.map((item, index) => {
            const isLast = index === allItems.length - 1;

            return (
              <li key={index} className="flex items-center gap-1.5">
                {index > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--kit-border)] shrink-0" aria-hidden="true" />
                )}

                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-1 hover:text-[var(--kit-text-primary)] transition-colors"
                  >
                    {index === 0 && showHome && (
                      <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "font-semibold text-[var(--kit-text-primary)]",
                      isLast && "truncate max-w-[200px] sm:max-w-xs"
                    )}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {index === 0 && showHome && (
                      <Home className="h-3.5 w-3.5 shrink-0 inline mr-1" aria-hidden="true" />
                    )}
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
