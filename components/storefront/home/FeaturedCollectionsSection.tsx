/**
 * components/storefront/home/FeaturedCollectionsSection.tsx
 *
 * Async Server Component. Homepage collections strip.
 *
 * Architectural Decision:
 *  - Featured Categories act as Collections (no separate schema needed).
 *  - Fetches top-level root categories via `categoryService.getCategoryTree()`.
 */

import Link from "next/link";
import * as categoryService from "@/services/category-service";
import { ROUTES } from "@/constants/routes";
import { ArrowRight, Layers } from "lucide-react";

export async function FeaturedCollectionsSection() {
  const categoryTree = await categoryService.getCategoryTree();
  // Take up to 3 primary categories as collections
  const collections = categoryTree.slice(0, 3);

  if (collections.length === 0) {
    return null;
  }

  return (
    <section className="bg-[var(--kit-surface)] border-y border-[var(--kit-border)] py-12 sm:py-16">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--kit-text-primary)]">
              Curated Collections
            </h2>
            <p className="text-xs sm:text-sm text-[var(--kit-muted-fg)] mt-1">
              Explore handpicked categories grouped for your lifestyle.
            </p>
          </div>

          <Link
            href={ROUTES.collections}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--kit-accent)] hover:underline underline-offset-4 transition-all"
          >
            <span>Explore All Collections</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Collection Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {collections.map((col) => {
            const collectionUrl = ROUTES.category(col.slug);

            return (
              <Link
                key={col.id}
                href={collectionUrl}
                className="group relative flex flex-col justify-between h-48 sm:h-56 p-6 rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] hover:border-[var(--kit-accent)] shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Background Accent Pill */}
                <div className="absolute top-0 right-0 h-32 w-32 bg-[var(--kit-accent)]/5 rounded-full blur-2xl group-hover:bg-[var(--kit-accent)]/10 transition-colors" />

                {/* Top Icon */}
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] font-bold">
                  <Layers className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="space-y-1 relative z-10">
                  <h3 className="text-lg font-bold text-[var(--kit-text-primary)] group-hover:text-[var(--kit-accent)] transition-colors">
                    {col.name}
                  </h3>
                  <p className="text-xs text-[var(--kit-muted-fg)] line-clamp-2">
                    {col.description ?? `Discover our latest ${col.name} collection.`}
                  </p>
                </div>

                {/* Action Indicator */}
                <div className="flex items-center gap-1 text-xs font-semibold text-[var(--kit-accent)] pt-2">
                  <span>Shop Collection</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
