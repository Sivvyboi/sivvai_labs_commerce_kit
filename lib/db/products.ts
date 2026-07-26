import "server-only";
import { createClient } from "../supabase/server";
import type { Database } from "@/types";
import type { CategoryRow } from "./categories";

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
export type ProductVariantRow = Database["public"]["Tables"]["product_variants"]["Row"];
export type ProductImageRow = Database["public"]["Tables"]["product_images"]["Row"];

export type ProductWithDetails = ProductRow & {
  category: CategoryRow | null;
  variants: ProductVariantRow[];
  images: ProductImageRow[];
};

export interface FindProductsParams {
  categorySlug?: string;
  status?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export async function findProducts(params: FindProductsParams = {}): Promise<{ data: ProductWithDetails[]; count: number }> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*, category:categories(*), variants:product_variants(*), images:product_images(*)");

  if (params.status) {
    query = query.eq("status", params.status);
  } else {
    query = query.eq("status", "published");
  }

  if (params.search) {
    query = query.ilike("name", `%${params.search}%`);
  }

  if (params.limit) {
    const from = params.offset || 0;
    const to = from + params.limit - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return { data: (data || []) as ProductWithDetails[], count: count || 0 };
}

export async function findProductById(id: string): Promise<ProductWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*), variants:product_variants(*), images:product_images(*)")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as ProductWithDetails;
}

export async function findProductBySlug(slug: string): Promise<ProductWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*), variants:product_variants(*), images:product_images(*)")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data as ProductWithDetails;
}

export async function createProduct(data: ProductInsert): Promise<ProductRow> {
  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("products")
    .insert(data)
    .select()
    .single();

  if (error || !inserted) throw error || new Error("Failed to create product");
  return inserted;
}

export async function updateProduct(id: string, data: ProductUpdate): Promise<ProductRow> {
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("products")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) throw error || new Error("Failed to update product");
  return updated;
}

export async function archiveProduct(id: string): Promise<ProductRow> {
  return updateProduct(id, { status: "archived", archived_at: new Date().toISOString() });
}
