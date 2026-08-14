import * as productRepo from "@/lib/db/products";
import { findProductByIdAdmin, findProductsAdmin } from "@/lib/db/products";
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
  // Use the admin-scoped lookup so draft/archived products are visible
  // to authenticated admin users (RLS still enforced via their JWT).
  const product = await findProductByIdAdmin(id);
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
  // Use session-aware client so RLS sees the admin JWT and returns draft/archived products.
  return findProductsAdmin({ ...params, status: params.status });
}

/**
 * Creates a complete product record in Supabase:
 *  1. Base product record in `products`.
 *  2. Default variant in `product_variants` (is_default: true, status: 'active').
 *  3. Associated `inventory_records` entry (on_hand_quantity: initialStock).
 */
export async function createProductAdmin(
  data: ProductInsert,
  initialStock = 0,
  sku?: string
) {
  const product = await productRepo.createProduct(data);
  const supabase = createAdminClient();

  const defaultSku =
    sku && sku.trim()
      ? sku.trim().toUpperCase()
      : `${product.slug.toUpperCase().slice(0, 10)}-DEFAULT`;

  // Create default variant
  const { data: defaultVariant, error: varErr } = await supabase
    .from("product_variants")
    .insert({
      product_id: product.id,
      sku: defaultSku,
      is_default: true,
      status: "active",
      option_combination: {},
    })
    .select()
    .single();

  if (!varErr && defaultVariant) {
    // Create inventory record for the default variant
    await supabase.from("inventory_records").insert({
      variant_id: defaultVariant.id,
      on_hand_quantity: Math.max(0, initialStock),
      reserved_quantity: 0,
      low_stock_threshold: 5,
      track_inventory: true,
    });
  }

  return product;
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

export async function unpublishProduct(id: string) {
  return productRepo.updateProduct(id, {
    status: "draft",
  });
}

export async function archiveProductAdmin(id: string) {
  return productRepo.archiveProduct(id);
}

export async function restoreProduct(id: string) {
  return productRepo.updateProduct(id, {
    status: "draft",
    archived_at: null,
  });
}

export async function duplicateProduct(id: string) {
  // Also use admin lookup so drafts/archived products can be duplicated.
  const original = await findProductByIdAdmin(id);
  if (!original) throw new NotFoundError("Product", id);

  const timestamp = Date.now();
  const newSlug = `${original.slug}-copy-${timestamp}`;

  const duplicate = await createProductAdmin(
    {
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
    },
    0
  );

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

/**
 * Deletes a physical file object from Supabase Storage by its relative storage path.
 * Throws an error if deletion fails.
 */
export async function removeStorageObject(path: string, bucket = "product-images"): Promise<void> {
  if (!path) return;
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error(`[removeStorageObject] Storage removal failed for '${path}' in bucket '${bucket}':`, error.message);
    throw new Error(`Storage cleanup failed for '${path}': ${error.message}`);
  }
}

/**
 * Extracts the relative storage object path from a Supabase storage URL.
 * Returns null if the URL does not belong to the specified Supabase storage bucket.
 */
export function extractStoragePath(url: string, bucket = "product-images"): string | null {
  if (!url) return null;

  try {
    // If it is already a direct relative path within the bucket
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("/")) {
      return url;
    }

    const parsed = new URL(url, "http://localhost");
    const pathname = parsed.pathname;
    const bucketMarker = `/${bucket}/`;
    const bucketIdx = pathname.indexOf(bucketMarker);

    if (bucketIdx !== -1) {
      const rawPath = pathname.slice(bucketIdx + bucketMarker.length);
      return decodeURIComponent(rawPath);
    }

    return null;
  } catch {
    const bucketMarker = `/${bucket}/`;
    const bucketIdx = url.indexOf(bucketMarker);
    if (bucketIdx !== -1) {
      const rawPath = url.slice(bucketIdx + bucketMarker.length).split("?")[0];
      return decodeURIComponent(rawPath);
    }
    return null;
  }
}

/**
 * Removes a single product image by ID.
 * Resolves the physical storage object path from the image record's URL,
 * removes the object from the Supabase `product-images` storage bucket (if hosted there),
 * and deletes the database record from `product_images`.
 */
export async function removeProductImage(imageId: string) {
  const supabase = createAdminClient();

  // 1. Fetch image record to obtain the URL
  const { data: imageRecord, error: fetchError } = await supabase
    .from("product_images")
    .select("id, url, product_id")
    .eq("id", imageId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch product image record: ${fetchError.message}`);
  }

  // If record is already deleted from DB, treat as idempotent success
  if (!imageRecord) {
    return;
  }

  // 2. Determine if URL is hosted in Supabase Storage and remove physical object
  const storagePath = extractStoragePath(imageRecord.url, "product-images");
  if (storagePath) {
    await removeStorageObject(storagePath, "product-images");
  }

  // 3. Delete database record only after physical storage cleanup succeeds
  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId);

  if (deleteError) {
    throw new Error(`Failed to delete product image database record: ${deleteError.message}`);
  }
}

/**
 * Deletes all physical storage objects and corresponding database records for a product.
 * Invariant: For each image, the database row is deleted ONLY after its Storage object
 * is confirmed removed. If any image fails, an error is thrown, the failed image's DB
 * row remains for retry safety, and execution halts before catalog soft-delete.
 */
export async function deleteProductImages(productId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: images, error: fetchError } = await supabase
    .from("product_images")
    .select("id, url")
    .eq("product_id", productId);

  if (fetchError) {
    throw new Error(`Failed to fetch product images for product ${productId}: ${fetchError.message}`);
  }

  if (!images || images.length === 0) {
    return;
  }

  for (const img of images) {
    const storagePath = extractStoragePath(img.url, "product-images");
    if (storagePath) {
      await removeStorageObject(storagePath, "product-images");
    }

    const { error: deleteError } = await supabase
      .from("product_images")
      .delete()
      .eq("id", img.id);

    if (deleteError) {
      throw new Error(`Failed to delete image record ${img.id}: ${deleteError.message}`);
    }
  }
}

/**
 * Permanently removes an archived product from the catalog.
 * Lifecycle rule: Only products in 'archived' state (and not already deleted) can be deleted.
 * Safety rule: Physical storage images are cleaned up first. If image cleanup fails, the product
 * is NOT soft-deleted. DB relational identity (variants, orders, snapshots) is preserved.
 */
export async function deleteProductFromCatalog(productId: string) {
  // 1. Fetch product to verify state
  const product = await findProductByIdAdmin(productId);
  if (!product) {
    throw new NotFoundError("Product", productId);
  }

  if (product.status !== "archived") {
    throw new Error("Only archived products can be deleted from the catalog. Please archive this product first.");
  }

  // 2. Clean up physical images from storage and their db records (aborts and preserves archived state if any fails)
  await deleteProductImages(productId);

  // 3. Mark product soft-deleted in database
  return productRepo.softDeleteProduct(productId);
}

/** Creates an option group for a product (e.g. Size, Color) */
export async function createOptionGroup(productId: string, name: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("option_groups")
    .insert({
      product_id: productId,
      name,
      display_order: 0,
    })
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to create option group");
  return data;
}

/** Deletes an option group by ID */
export async function deleteOptionGroup(groupId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("option_groups").delete().eq("id", groupId);
  if (error) throw error;
}

/** Adds an option value to an option group (e.g. Small, Red) */
export async function addOptionValue(optionGroupId: string, label: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("option_values")
    .insert({
      option_group_id: optionGroupId,
      label,
      display_order: 0,
    })
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to add option value");
  return data;
}

/** Deletes an option value by ID */
export async function deleteOptionValue(valueId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("option_values").delete().eq("id", valueId);
  if (error) throw error;
}
