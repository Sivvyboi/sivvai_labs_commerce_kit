/**
 * components/storefront/home/CategoriesSection.tsx
 *
 * Async Server Component. Homepage category browsing section.
 *
 * Displays top categories with quick-filter pills/cards.
 * When a category has an og_image set, it renders the image;
 * otherwise falls back to a Tag icon placeholder.
 */

import Image from "next/image";
import Link from "next/link";
import * as categoryService from "@/services/category-service";
import { ROUTES } from "@/constants/routes";
import { Tag } from "lucide-react";

export async function CategoriesSection() {
  // Use flat list so ALL active categories (including subcategories) are shown.
  const categories = await categoryService.getCategories();

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 space-y-6">
      {/* Section Title */}
      <div className="text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--kit-text-primary)]">
          Shop by Category
        </h2>
        <p className="text-xs text-[var(--kit-muted-fg)] mt-0.5">
          Find exactly what you&apos;re looking for.
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={ROUTES.category(cat.slug)}
            className="group flex flex-col items-center justify-center p-4 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] hover:border-[var(--kit-accent)] hover:bg-[var(--kit-surface)] shadow-xs transition-all text-center"
          >
            {/* Image or icon */}
            <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--kit-surface)] group-hover:bg-[var(--kit-accent)]/10 mb-2 transition-colors">
              {cat.og_image ? (
                <Image
                  src={cat.og_image}
                  alt={cat.name}
                  fill
                  className="object-cover rounded-full"
                  sizes="48px"
                />
              ) : (
                <Tag className="h-5 w-5 text-[var(--kit-muted-fg)] group-hover:text-[var(--kit-accent)] transition-colors" />
              )}
            </div>

            <span className="text-xs font-semibold text-[var(--kit-text-primary)] group-hover:text-[var(--kit-accent)] transition-colors truncate w-full">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
