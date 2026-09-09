/**
 * components/storefront/home/FeaturedCollectionsSection.tsx
 *
 * Async Server Component. Homepage collections strip.
 *
 * Architectural Decision:
 *  - Featured Categories act as Collections (no separate schema needed).
 *  - Fetches top-level root categories via `categoryService.getCategoryTree()`.
 *  - When a category has an og_image, it is used as a full-bleed card background
 *    with a dark gradient overlay to keep text legible.
 */

import Image from "next/image";
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
            const hasImage = Boolean(col.og_image);

            return (
              <Link
                key={col.id}
                href={collectionUrl}
                className="group relative flex flex-col justify-between h-48 sm:h-56 p-6 rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] hover:border-[var(--kit-accent)] shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Full-bleed background image (when set) */}
                {hasImage && (
                  <>
                    <Image
                      src={col.og_image!}
                      alt={col.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    {/* Gradient overlay to keep text legible over any image */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10 group-hover:from-black/75 transition-colors" />
                  </>
                )}

                {/* Background Accent Pill (fallback, no image) */}
                {!hasImage && (
                  <div className="absolute top-0 right-0 h-32 w-32 bg-[var(--kit-accent)]/5 rounded-full blur-2xl group-hover:bg-[var(--kit-accent)]/10 transition-colors" />
                )}

                {/* Top Icon (shown only when no image) */}
                {!hasImage && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] font-bold relative z-10">
                    <Layers className="h-5 w-5" />
                  </div>
                )}

                {/* Spacer when image is present (pushes content to bottom) */}
                {hasImage && <div />}

                {/* Content */}
                <div className="space-y-1 relative z-10">
                  <h3
                    className={`text-lg font-bold transition-colors ${
                      hasImage
                        ? "text-white"
                        : "text-[var(--kit-text-primary)] group-hover:text-[var(--kit-accent)]"
                    }`}
                  >
                    {col.name}
                  </h3>
                  <p
                    className={`text-xs line-clamp-2 ${
                      hasImage ? "text-white/80" : "text-[var(--kit-muted-fg)]"
                    }`}
                  >
                    {col.description ?? `Discover our latest ${col.name} collection.`}
                  </p>
                </div>

                {/* Action Indicator */}
                <div
                  className={`flex items-center gap-1 text-xs font-semibold pt-2 relative z-10 ${
                    hasImage ? "text-white" : "text-[var(--kit-accent)]"
                  }`}
                >
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
