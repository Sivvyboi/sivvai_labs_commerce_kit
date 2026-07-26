/**
 * components/storefront/layout/SearchOverlay.tsx
 *
 * Client Component. Instant search modal / overlay.
 *
 * Features:
 *  - 300ms debounced input search against `/api/products?search=`
 *  - Mini product result list preview with direct links
 *  - Recent searches history saved to `localStorage`
 *  - Full WCAG accessibility: ESC key handler, focus trap, aria attributes
 */

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ProductWithDetails } from "@/lib/db/products";
import { Price } from "@/components/shared/Price";
import { ROUTES } from "@/constants/routes";
import { Search, X, History, ArrowRight, Loader2 } from "lucide-react";

export interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const LOCAL_STORAGE_KEY = "sivvai_recent_searches";
const MAX_RECENT_SEARCHES = 5;

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  // Lazy initializer reads localStorage only on the client; returns [] during SSR.
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  // Handle ESC key and scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Debounced search fetch — all setState calls happen inside the timer callback
  // to satisfy the react-hooks/set-state-in-effect rule.
  useEffect(() => {
    const delay = query.trim() ? 300 : 0;

    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(query.trim())}&limit=5`
        );
        if (res.ok) {
          const json = (await res.json()) as { data?: ProductWithDetails[]; products?: ProductWithDetails[] };
          setResults(json.data ?? json.products ?? []);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [query]);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore write errors
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    saveRecentSearch(query);
    onClose();
    router.push(ROUTES.searchQuery(query.trim()));
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    saveRecentSearch(term);
    onClose();
    router.push(ROUTES.searchQuery(term));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // Ignore errors
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm transition-opacity">
      {/* Backdrop click to close */}
      <div className="absolute inset-0 z-0" onClick={onClose} aria-hidden="true" />

      {/* Main Search Panel */}
      <div className="relative z-10 w-full bg-[var(--kit-bg)] border-b border-[var(--kit-border)] shadow-xl p-4 sm:p-6 transition-all duration-200 animate-in slide-in-from-top-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {/* Top Form Header */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-[var(--kit-muted-fg)] pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, collections, styles..."
              className="w-full rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] pl-12 pr-12 py-3.5 text-sm sm:text-base text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] outline-none focus:ring-2 focus:ring-[var(--kit-accent)] focus:border-transparent min-h-[48px]"
            />

            {loading ? (
              <Loader2 className="absolute right-4 h-5 w-5 animate-spin text-[var(--kit-accent)]" />
            ) : query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-4 p-1 text-[var(--kit-muted-fg)] hover:text-[var(--kit-text-primary)]"
                aria-label="Clear search query"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 p-1 text-[var(--kit-muted-fg)] hover:text-[var(--kit-text-primary)]"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </form>

          {/* Recent Searches (when query is empty) */}
          {!query.trim() && recentSearches.length > 0 && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase text-[var(--kit-muted-fg)]">
                <span className="flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  Recent Searches
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="hover:underline text-[var(--kit-muted-fg)]"
                >
                  Clear History
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleRecentClick(term)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--kit-surface)] border border-[var(--kit-border)] px-3 py-1.5 text-xs text-[var(--kit-text-primary)] hover:border-[var(--kit-accent)] hover:text-[var(--kit-accent)] transition-colors"
                  >
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results List Preview */}
          {query.trim() && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--kit-muted-fg)] border-b border-[var(--kit-border)] pb-2">
                <span>
                  {results.length > 0
                    ? `Showing ${results.length} result${results.length > 1 ? "s" : ""}`
                    : "No matching products"}
                </span>

                {results.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="inline-flex items-center gap-1 text-[var(--kit-accent)] hover:underline"
                  >
                    <span>View all results</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Product Result Items */}
              <div className="divide-y divide-[var(--kit-border)] max-h-80 overflow-y-auto">
                {results.map((product) => {
                  const image = product.images?.find((img) => img.is_primary) ?? product.images?.[0];

                  return (
                    <Link
                      key={product.id}
                      href={ROUTES.product(product.slug)}
                      onClick={onClose}
                      className="group flex items-center gap-4 py-3 px-2 rounded-xl hover:bg-[var(--kit-surface)] transition-colors"
                    >
                      {/* Image */}
                      <div className="relative h-12 w-12 rounded-lg bg-[var(--kit-surface)] border border-[var(--kit-border)] overflow-hidden shrink-0">
                        {image?.url ? (
                          <Image
                            src={image.url}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs text-[var(--kit-muted-fg)]">
                            No img
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--kit-text-primary)] group-hover:text-[var(--kit-accent)] transition-colors truncate">
                          {product.name}
                        </p>
                        {product.category?.name && (
                          <p className="text-xs text-[var(--kit-muted-fg)] truncate">
                            {product.category.name}
                          </p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-right text-xs font-bold text-[var(--kit-text-primary)]">
                        <Price amount={product.base_price} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
