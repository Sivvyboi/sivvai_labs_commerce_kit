/**
 * services/category-service.ts
 *
 * Category domain service layer.
 * All category operations for storefront pages pass through here.
 */

import * as categoryRepo from "@/lib/db/categories";
import type { CategoryRow } from "@/lib/db/categories";
import { NotFoundError } from "@/lib/errors";

export type CategoryWithChildren = CategoryRow & { children: CategoryWithChildren[] };

function buildChildren(
  all: CategoryRow[],
  parentId: string
): CategoryWithChildren[] {
  return all
    .filter((c) => c.parent_id === parentId)
    .map((c) => ({
      ...c,
      children: buildChildren(all, c.id),
    }));
}

/** Fetches all active non-archived categories flat. */
export async function getCategories(): Promise<CategoryRow[]> {
  return categoryRepo.findCategories();
}

/** Fetches categories structured into a parent-child tree. */
export async function getCategoryTree(): Promise<CategoryWithChildren[]> {
  const categories = await categoryRepo.findCategories();
  return categories
    .filter((c) => !c.parent_id)
    .map((root) => ({
      ...root,
      children: buildChildren(categories, root.id),
    }));
}

/** Fetches a single category by slug. Throws NotFoundError if missing. */
export async function getCategoryBySlug(slug: string): Promise<CategoryRow> {
  const category = await categoryRepo.findCategoryBySlug(slug);
  if (!category) {
    throw new NotFoundError("Category", slug);
  }
  return category;
}
