"use server";

import * as productService from "@/services/product-service";
import type { ProductWithDetails } from "@/lib/db/products";

export async function searchProductsAction(query: string, limit = 5): Promise<{
  success: boolean;
  products: ProductWithDetails[];
  error?: string;
}> {
  try {
    if (!query.trim()) {
      return { success: true, products: [] };
    }
    const result = await productService.getProducts({
      search: query.trim(),
      limit,
      status: "published",
    });

    return { success: true, products: result.data };
  } catch (err) {
    return {
      success: false,
      products: [],
      error: err instanceof Error ? err.message : "Search failed",
    };
  }
}
