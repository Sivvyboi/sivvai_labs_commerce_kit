import * as categoryRepo from "@/lib/db/categories";
import type { CategoryRow } from "@/lib/db/categories";
import { NotFoundError } from "@/lib/errors";

type CategoryWithChildren = CategoryRow & { children: CategoryWithChildren[] };

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

export async function getCategoryTree(): Promise<CategoryWithChildren[]> {
  const categories = await categoryRepo.findCategories();
  return categories
    .filter((c) => !c.parent_id)
    .map((root) => ({
      ...root,
      children: buildChildren(categories, root.id),
    }));
}

export async function getCategoryBySlug(slug: string) {
  const category = await categoryRepo.findCategoryBySlug(slug);
  if (!category) {
    throw new NotFoundError("Category", slug);
  }
  return category;
}
