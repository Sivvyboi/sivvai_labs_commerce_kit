/**
 * app/(admin)/categories/page.tsx
 *
 * Category Management Page — Server Component.
 * Fetches all categories (including archived) and passes to client manager component.
 */

import * as React from "react";
import type { Metadata } from "next";

import { requirePermissionPage } from "@/lib/auth/admin-guard";
import { getAllCategories } from "@/services/category-service";
import { CategoryManager } from "./CategoryManager";

export const metadata: Metadata = {
  title: "Categories",
};

export default async function AdminCategoriesPage() {
  await requirePermissionPage("manage_categories");
  const categories = await getAllCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--kit-text-primary)]">Category Management</h1>
        <p className="mt-0.5 text-sm text-[var(--kit-text-secondary)]">
          Organise your store products into categories ({categories.length} total)
        </p>
      </div>

      <CategoryManager initialCategories={categories} />
    </div>
  );
}
