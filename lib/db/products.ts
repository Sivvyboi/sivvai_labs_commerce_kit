import "server-only";
import { createClient } from "../supabase/server";
import type { Database } from "@/types";
import type { CategoryRow } from "./categories";

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
export type ProductVariantRow = Database["public"]["Tables"]["product_variants"]["Row"];
export type ProductImageRow = Database["public"]["Tables"]["product_images"]["Row"];

export type ProductGroupRow = Database["public"]["Tables"]["option_groups"]["Row"];
export type ProductValueRow = Database["public"]["Tables"]["option_values"]["Row"];

export type OptionGroupWithValues = ProductGroupRow & {
  values: ProductValueRow[];
};

export type ProductWithDetails = ProductRow & {
  category: CategoryRow | null;
  variants: ProductVariantRow[];
  images: ProductImageRow[];
  option_groups?: OptionGroupWithValues[];
};

export type ProductSortOption =
  | "newest"
  | "oldest"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc"
  | "featured";

export interface FindProductsParams {
  categorySlug?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSortOption;
  status?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export async function findProducts(
  params: FindProductsParams = {}
): Promise<{ data: ProductWithDetails[]; count: number }> {
  const supabase = await createClient();

  // If categorySlug is specified, fetch category ID first or join
  let categoryId: string | undefined;
  if (params.categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", params.categorySlug)
      .maybeSingle();

    if (cat) {
      categoryId = cat.id;
    }
  }

  let query = supabase
    .from("products")
    .select("*, category:categories(*), variants:product_variants(*), images:product_images(*), option_groups(*, values:option_values(*))", {
      count: "exact",
    });

  // Status Filter (default: published)
  if (params.status) {
    query = query.eq("status", params.status);
  } else {
    query = query.eq("status", "published");
  }

  // Category Filter
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  // Featured Filter
  if (params.featured !== undefined) {
    query = query.eq("is_featured", params.featured);
  }

  // Price Range Filter (base_price in minor units / kobo)
  if (params.minPrice !== undefined && !isNaN(params.minPrice)) {
    query = query.gte("base_price", params.minPrice);
  }
  if (params.maxPrice !== undefined && !isNaN(params.maxPrice)) {
    query = query.lte("base_price", params.maxPrice);
  }

  // Search Filter
  if (params.search) {
    query = query.ilike("name", `%${params.search.trim()}%`);
  }

  // Sorting
  const sort = params.sort ?? "newest";
  switch (sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "price-asc":
      query = query.order("base_price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("base_price", { ascending: false });
      break;
    case "name-asc":
      query = query.order("name", { ascending: true });
      break;
    case "name-desc":
      query = query.order("name", { ascending: false });
      break;
    case "featured":
      query = query
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  // Pagination Range
  if (params.limit) {
    const from = params.offset || 0;
    const to = from + params.limit - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data || []) as unknown as ProductWithDetails[], count: count || 0 };
}

export async function findProductById(id: string): Promise<ProductWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*), variants:product_variants(*), images:product_images(*), option_groups(*, values:option_values(*))")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as ProductWithDetails;
}

export async function findProductBySlug(slug: string): Promise<ProductWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*), variants:product_variants(*), images:product_images(*), option_groups(*, values:option_values(*))")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data as unknown as ProductWithDetails;
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
