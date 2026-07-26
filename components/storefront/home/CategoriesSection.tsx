/**
 * components/storefront/home/CategoriesSection.tsx
 *
 * Async Server Component. Homepage category browsing section.
 *
 * Displays top categories with quick-filter pills/cards.
 */

import Link from "next/link";
import * as categoryService from "@/services/category-service";
import { ROUTES } from "@/constants/routes";
import { Tag } from "lucide-react";

export async function CategoriesSection() {
  const categories = await categoryService.getCategoryTree();

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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--kit-surface)] group-hover:bg-[var(--kit-accent)]/10 text-[var(--kit-muted-fg)] group-hover:text-[var(--kit-accent)] transition-colors mb-2">
              <Tag className="h-4 w-4" />
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
