/**
 * app/(admin)/products/[id]/page.tsx
 *
 * Product Edit Detail Page — Server Component.
 * Fetches product details and passes to client edit component.
 */

import * as React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requirePermissionPage } from "@/lib/auth/admin-guard";
import { getProductById } from "@/services/product-service";
import { getCategories } from "@/services/category-service";
import { EditProductForm } from "./EditProductForm";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id).catch(() => null);
  return {
    title: product ? `Edit ${product.name}` : "Edit Product",
  };
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  await requirePermissionPage("manage_products");
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductById(id).catch(() => null),
    getCategories(),
  ]);

  if (!product) {
    notFound();
  }

  return <EditProductForm product={product} categories={categories} />;
}
