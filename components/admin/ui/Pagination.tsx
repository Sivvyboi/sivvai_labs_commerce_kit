/**
 * components/admin/ui/Pagination.tsx
 *
 * URL-driven pagination controls.
 * Reads `offset` and `limit` from URL search params.
 * Server Component — renders anchor tags, no JS needed.
 */

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  /** Base URL path to build pagination links from. Existing search params are preserved. */
  basePath: string;
  /** Additional search params to preserve (e.g. { q: "shoes", status: "published" }) */
  searchParams?: Record<string, string | undefined>;
}

function buildUrl(basePath: string, params: Record<string, string | undefined>, offset: number): string {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") p.set(k, v);
  });
  if (offset > 0) p.set("offset", String(offset));
  else p.delete("offset");
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({ total, limit, offset, basePath, searchParams = {} }: PaginationProps) {
  if (total <= limit) return null;

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  // Build page number list — show at most 7 page numbers
  const pages: (number | "ellipsis")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
  }

  const navClass = clsx(
    "inline-flex h-8 items-center justify-center rounded-[var(--kit-radius-md)] px-3 text-sm",
    "border border-[var(--kit-border)] bg-[var(--kit-surface)]",
    "text-[var(--kit-text-secondary)] transition-colors hover:bg-[var(--kit-muted)]"
  );
  const disabledClass = "pointer-events-none opacity-40";
  const activeClass = "bg-[var(--kit-accent)] text-white border-transparent hover:bg-[var(--kit-accent)]";

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-2 py-4"
    >
      <p className="text-xs text-[var(--kit-text-muted)]">
        Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
      </p>

      <div className="flex items-center gap-1">
        {/* Prev */}
        {hasPrev ? (
          <Link
            href={buildUrl(basePath, searchParams, Math.max(0, offset - limit))}
            className={navClass}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </Link>
        ) : (
          <span className={clsx(navClass, disabledClass)} aria-disabled>
            <ChevronLeft size={14} />
          </span>
        )}

        {/* Page numbers */}
        {pages.map((page, idx) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-sm text-[var(--kit-text-muted)]">
              …
            </span>
          ) : (
            <Link
              key={page}
              href={buildUrl(basePath, searchParams, (page - 1) * limit)}
              className={clsx(navClass, page === currentPage && activeClass)}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </Link>
          )
        )}

        {/* Next */}
        {hasNext ? (
          <Link
            href={buildUrl(basePath, searchParams, offset + limit)}
            className={navClass}
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </Link>
        ) : (
          <span className={clsx(navClass, disabledClass)} aria-disabled>
            <ChevronRight size={14} />
          </span>
        )}
      </div>
    </nav>
  );
}
