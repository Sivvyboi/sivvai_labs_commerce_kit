import "server-only";
import { createClient, createPublicClient } from "../supabase/server";
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
  excludeArchived?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
}

// Explicit column selects — avoids fetching unnecessary columns and ensures type safety
const PRODUCT_COLUMNS = `
  id, slug, name, description, base_price, sale_price, compare_at_price,
  status, is_featured, category_id, seo_title, seo_description,
  archived_at, created_at, updated_at,
  category:categories(id, name, slug, description, archived_at),
  variants:product_variants(
    id, product_id, image_id, sku, option_combination, price_override, is_default, status,
    archived_at, created_at, updated_at
  ),
  images:product_images(
    id, product_id, url, alt_text, display_order, is_primary, created_at
  ),
  option_groups(
    id, product_id, name, display_order,
    values:option_values(id, option_group_id, label, display_order, swatch_type, swatch_value)
  )
`.trim();

export async function findProducts(
  params: FindProductsParams = {}
): Promise<{ data: ProductWithDetails[]; count: number }> {
  const supabase = createPublicClient();

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
    .select(PRODUCT_COLUMNS, { count: "exact" })
    .is("deleted_at", null);

  // Status filter (default: published)
  if (params.status) {
    query = query.eq("status", params.status);
  } else {
    query = query.eq("status", "published");
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (params.featured !== undefined) {
    query = query.eq("is_featured", params.featured);
  }

  if (params.minPrice !== undefined && !isNaN(params.minPrice)) {
    query = query.gte("base_price", params.minPrice);
  }
  if (params.maxPrice !== undefined && !isNaN(params.maxPrice)) {
    query = query.lte("base_price", params.maxPrice);
  }

  // Full-text search using materialized tsvector column (migration 027)
  if (params.search) {
    const sanitized = params.search.trim().replace(/[&|!():*'"\\]/g, " ").trim();
    if (sanitized) {
      query = query.textSearch("search_vector", sanitized, {
        type: "websearch",
        config: "english",
      });
    }
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

  // Pagination
  if (params.limit) {
    const from = params.offset || 0;
    const to = from + params.limit - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data || []) as unknown as ProductWithDetails[], count: count || 0 };
}

/**
 * Admin-only: lists products of any status using the authenticated admin session.
 * RLS is still enforced via the admin user's JWT — this just bypasses the
 * "anon can only see published" constraint on the public client.
 * Does NOT default to status=published so all statuses are returned unless filtered.
 * Excludes soft-deleted products (deleted_at IS NULL).
 */
export async function findProductsAdmin(
  params: FindProductsParams = {}
): Promise<{ data: ProductWithDetails[]; count: number }> {
  const supabase = await createClient();

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
    .select(PRODUCT_COLUMNS, { count: "exact" })
    .is("deleted_at", null);

  // Admin: filter by status if provided, or exclude archived if specified
  if (params.status) {
    query = query.eq("status", params.status);
  } else if (params.excludeArchived) {
    query = query.neq("status", "archived");
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (params.featured !== undefined) {
    query = query.eq("is_featured", params.featured);
  }

  if (params.minPrice !== undefined && !isNaN(params.minPrice)) {
    query = query.gte("base_price", params.minPrice);
  }
  if (params.maxPrice !== undefined && !isNaN(params.maxPrice)) {
    query = query.lte("base_price", params.maxPrice);
  }

  // Full-text search
  if (params.search) {
    const sanitized = params.search.trim().replace(/[&|!():*'"\\]/g, " ").trim();
    if (sanitized) {
      query = query.textSearch("search_vector", sanitized, {
        type: "websearch",
        config: "english",
      });
    }
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

  // Pagination
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
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as ProductWithDetails;
}

/**
 * Admin-only: fetches any product by ID regardless of status (draft, archived, etc).
 * Uses the session-aware server client so RLS evaluates the authenticated admin user's
 * JWT — security is maintained without needing the service-role key.
 * Uses .maybeSingle() to return null cleanly (no 406) when no row is found.
 */
export async function findProductByIdAdmin(id: string): Promise<ProductWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as ProductWithDetails;
}

export async function findProductBySlug(slug: string): Promise<ProductWithDetails | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

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

export async function softDeleteProduct(id: string): Promise<ProductRow> {
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "archived")
    .is("deleted_at", null)
    .select()
    .single();

  if (error || !updated) {
    throw error || new Error("Failed to delete product from catalog or product is not in archived state");
  }
  return updated;
}
