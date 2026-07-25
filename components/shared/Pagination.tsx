/**
 * components/shared/Pagination.tsx
 *
 * Reusable pagination component for catalog, categories, and search results.
 * Generates accessible page links using Next.js Link.
 */

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  /** Current active page number (1-indexed) */
  currentPage: number;
  /** Total number of available pages */
  totalPages: number;
  /** Base URL path, e.g. "/catalog" */
  basePath: string;
  /** Optional extra URL search params to preserve, e.g. { category: "shoes", sort: "price-asc" } */
  query?: Record<string, string | number | undefined>;
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  query = {},
  className,
  ...props
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  // Helper to build page URL
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && key !== "page") {
        params.set(key, String(val));
      }
    });
    if (page > 1) {
      params.set("page", String(page));
    }
    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  // Build page number range with ellipsis
  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    const delta = 1; // Number of pages to show on each side of current page

    const left = currentPage - delta;
    const right = currentPage + delta;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= left && i <= right)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }

    return pages;
  };

  const pages = getPageNumbers();
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1.5 py-4", className)}
      {...props}
    >
      {/* Previous Button */}
      {hasPrev ? (
        <Link
          href={createPageUrl(currentPage - 1)}
          aria-label="Go to previous page"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors min-h-[44px]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-muted-fg)] opacity-40 cursor-not-allowed min-h-[44px]"
        >
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pages.map((p, index) => {
          if (p === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="flex h-10 w-8 items-center justify-center text-xs text-[var(--kit-muted-fg)]"
              >
                …
              </span>
            );
          }

          const isCurrent = p === currentPage;

          return (
            <Link
              key={p}
              href={createPageUrl(p)}
              aria-label={`Page ${p}`}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg text-xs font-semibold transition-colors min-h-[44px]",
                isCurrent
                  ? "bg-[var(--kit-accent)] text-[var(--kit-accent-fg)]"
                  : "border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)]"
              )}
            >
              {p}
            </Link>
          );
        })}
      </div>

      {/* Next Button */}
      {hasNext ? (
        <Link
          href={createPageUrl(currentPage + 1)}
          aria-label="Go to next page"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors min-h-[44px]"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-muted-fg)] opacity-40 cursor-not-allowed min-h-[44px]"
        >
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
