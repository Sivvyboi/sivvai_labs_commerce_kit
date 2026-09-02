/**
 * app/admin/products/new/page.tsx
 *
 * New Product Creation Page — Server Component.
 * Fetches active categories server-side and passes them to NewProductForm.
 */

import * as React from "react";
import type { Metadata } from "next";

import { requirePermissionPage } from "@/lib/auth/admin-guard";
import { getCategories } from "@/services/category-service";
import { NewProductForm } from "./NewProductForm";

export const metadata: Metadata = {
  title: "New Product",
};

export default async function NewProductPage() {
  await requirePermissionPage("manage_products");
  const categories = await getCategories();

  return <NewProductForm categories={categories} />;
}
