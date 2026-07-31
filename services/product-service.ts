import * as productRepo from "@/lib/db/products";
import { NotFoundError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProductInsert, ProductUpdate } from "@/lib/db/products";

export async function getProducts(params?: productRepo.FindProductsParams) {
  return productRepo.findProducts(params);
}

export async function getProductBySlug(slug: string) {
  const product = await productRepo.findProductBySlug(slug);
  if (!product) {
    throw new NotFoundError("Product", slug);
  }
  return product;
}

export async function getProductById(id: string) {
  const product = await productRepo.findProductById(id);
  if (!product) {
    throw new NotFoundError("Product", id);
  }
  return product;
}

// ---------------------------------------------------------------------------
// Admin service functions
// ---------------------------------------------------------------------------

/** Returns all products for admin (any status) with full details */
export async function getAllProducts(params: productRepo.FindProductsParams = {}) {
  // Override status to undefined so we get all statuses
  return productRepo.findProducts({ ...params, status: params.status });
}

export async function createProductAdmin(data: ProductInsert) {
  return productRepo.createProduct(data);
}

export async function updateProductAdmin(id: string, data: ProductUpdate) {
  return productRepo.updateProduct(id, data);
}

export async function publishProduct(id: string) {
  return productRepo.updateProduct(id, {
    status: "published",
    published_at: new Date().toISOString(),
  });
}

export async function archiveProductAdmin(id: string) {
  return productRepo.archiveProduct(id);
}

export async function duplicateProduct(id: string) {
  const original = await productRepo.findProductById(id);
  if (!original) throw new NotFoundError("Product", id);

  const timestamp = Date.now();
  const newSlug = `${original.slug}-copy-${timestamp}`;

  const duplicate = await productRepo.createProduct({
    name: `COPY OF ${original.name}`,
    slug: newSlug,
    description: original.description,
    category_id: original.category_id,
    status: "draft",
    base_price: original.base_price,
    sale_price: original.sale_price,
    compare_at_price: original.compare_at_price,
    cost_price: original.cost_price,
    is_featured: false,
    seo_title: original.seo_title,
    seo_description: original.seo_description,
  });

  return duplicate;
}

/** Updates a product variant's editable fields (SKU + price override) */
export async function updateVariantAdmin(
  variantId: string,
  data: { sku?: string | null; price_override?: number | null }
) {
  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from("product_variants")
    .update(data)
    .eq("id", variantId)
    .select()
    .single();

  if (error || !updated) throw error || new Error("Failed to update variant");
  return updated;
}

/** Adds a product image URL */
export async function addProductImage(
  productId: string,
  url: string,
  altText?: string,
  isPrimary = false
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      url,
      alt_text: altText ?? null,
      is_primary: isPrimary,
      display_order: 0,
    })
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to add product image");
  return data;
}

/** Removes a product image by ID */
export async function removeProductImage(imageId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) throw error;
}
