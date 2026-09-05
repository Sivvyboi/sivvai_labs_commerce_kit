import * as productRepo from "@/lib/db/products";
import { findProductByIdAdmin, findProductsAdmin } from "@/lib/db/products";
import { NotFoundError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProductInsert, ProductUpdate } from "@/lib/db/products";
import {
  generateCartesianCombinations,
} from "@/lib/variants/combination";

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
 *  3. The DB trigger `trigger_ensure_variant_inventory` fires automatically and
 *     creates the companion `inventory_records` row with on_hand_quantity = 0.
 *  4. If initialStock > 0, we UPDATE that trigger-created row to set the
 *     requested stock. This is the single authoritative inventory-creation path.
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

  // 1. Insert the default variant — the DB trigger immediately creates the
  //    inventory_records row (on_hand_quantity = 0, reserved_quantity = 0).
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

  if (varErr || !defaultVariant) {
    // Variant creation failed; product row exists but is incomplete.
    // Surface the error so callers can decide how to handle it.
    throw varErr || new Error("Failed to create default variant for product");
  }

  // 2. Apply initialStock by updating the trigger-created inventory row.
  //    We never INSERT here — the trigger is the single authority for creation.
  if (initialStock > 0) {
    const { error: invErr } = await supabase
      .from("inventory_records")
      .update({ on_hand_quantity: Math.max(0, initialStock) })
      .eq("variant_id", defaultVariant.id);

    if (invErr) {
      console.error(
        `[createProductAdmin] Failed to set initialStock for variant ${defaultVariant.id}:`,
        invErr.message
      );
      // Non-fatal: product + variant exist; stock can be adjusted manually.
    }
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

/** Deletes an option group by ID and safely reconciles dependent variants */
export async function deleteOptionGroup(groupId: string, productId?: string) {
  const supabase = createAdminClient();
  let pid = productId;
  if (!pid) {
    const { data } = await supabase
      .from("option_groups")
      .select("product_id")
      .eq("id", groupId)
      .maybeSingle();
    pid = data?.product_id;
  }

  const { error } = await supabase.from("option_groups").delete().eq("id", groupId);
  if (error) throw error;

  if (pid) {
    await syncProductVariants(pid);
  }
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

/** Deletes an option value by ID and safely reconciles dependent variants */
export async function deleteOptionValue(valueId: string, productId?: string) {
  const supabase = createAdminClient();
  let pid = productId;
  if (!pid) {
    const { data } = await supabase
      .from("option_values")
      .select("option_groups(product_id)")
      .eq("id", valueId)
      .maybeSingle();
    pid = (data as unknown as { option_groups?: { product_id?: string } })?.option_groups?.product_id;
  }

  const { error } = await supabase.from("option_values").delete().eq("id", valueId);
  if (error) throw error;

  if (pid) {
    await syncProductVariants(pid);
  }
}

// ---------------------------------------------------------------------------
// Variant Lifecycle & Generation
// ---------------------------------------------------------------------------

export interface SyncProductVariantsResult {
  created: number;
  reactivated: number;
  retired: number;
  total: number;
}

/**
 * Synchronizes product variants with current option groups and values:
 * 1. Generates target combinations via Cartesian product (or [{}] for simple products).
 * 2. Delegates the atomic create / reactivate / retire / ensure-default sequence
 *    to the sync_product_variants_rpc PL/pgSQL function, which runs the full
 *    operation in a single DB transaction.
 *
 * Previous implementation made sequential DB calls with no transaction boundary.
 * A failure at any step left the product in partial variant state. The RPC
 * eliminates this window by being all-or-nothing at the database level.
 */
export async function syncProductVariants(productId: string): Promise<SyncProductVariantsResult> {
  const product = await findProductByIdAdmin(productId);
  if (!product) throw new NotFoundError("Product", productId);

  // Compute target combinations on the TypeScript side (Cartesian product with
  // canonical normalization). The DB RPC performs the sync atomically.
  const targetCombos = generateCartesianCombinations(product.option_groups || []);

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("sync_product_variants_rpc" as never, {
    p_product_id: productId,
    p_target_combinations: JSON.stringify(targetCombos),
  } as never);

  if (error) {
    throw new Error(
      `sync_product_variants_rpc failed for product ${productId}: ${error.message}`
    );
  }

  const result = data as {
    created: number;
    reactivated: number;
    retired: number;
    total: number;
    default_variant_id: string | null;
  };

  return {
    created:     result.created     ?? 0,
    reactivated: result.reactivated ?? 0,
    retired:     result.retired     ?? 0,
    total:       result.total       ?? 0,
  };
}

/**
 * Atomically sets a variant as default for a product.
 * Guard: Only an active, non-archived variant may be promoted.
 * The DB RPC enforces this constraint; the service layer surfaces a clear error.
 */
export async function setDefaultVariantAdmin(productId: string, variantId: string) {
  // Fetch the target variant to validate lifecycle state before calling the RPC.
  const supabase = createAdminClient();
  const { data: targetVariant, error: fetchErr } = await supabase
    .from("product_variants")
    .select("id, status, archived_at, product_id")
    .eq("id", variantId)
    .eq("product_id", productId)
    .maybeSingle();

  if (fetchErr || !targetVariant) {
    throw fetchErr || new Error(`Variant ${variantId} not found for product ${productId}`);
  }

  if (targetVariant.status !== "active" || targetVariant.archived_at !== null) {
    throw new Error(
      `Variant ${variantId} cannot be set as default: it must be active and non-archived ` +
      `(current status: ${targetVariant.status}, archived_at: ${targetVariant.archived_at ?? "null"})`
    );
  }

  return productRepo.setDefaultVariant(productId, variantId);
}

/**
 * Toggles variant status between active and inactive.
 *
 * Default-variant guard:
 * If the variant being deactivated is currently the product's default, this
 * function automatically promotes the next eligible active, non-archived
 * variant as the new default. If no eligible successor exists, the deactivated
 * variant's is_default flag is cleared — the product temporarily has no default
 * (the sync pass will repair this when a new option value is added).
 */
export async function toggleVariantStatusAdmin(
  variantId: string,
  status: "active" | "inactive"
) {
  const supabase = createAdminClient();

  // Fetch the variant to check if it is the current default.
  const { data: target, error: fetchErr } = await supabase
    .from("product_variants")
    .select("id, is_default, product_id")
    .eq("id", variantId)
    .maybeSingle();

  if (fetchErr || !target) {
    throw fetchErr || new Error(`Variant ${variantId} not found`);
  }

  const updated = await productRepo.updateVariant(variantId, {
    status,
    archived_at: status === "inactive" ? new Date().toISOString() : null,
    // Clear is_default when deactivating; we'll assign a successor below.
    ...(status === "inactive" && target.is_default ? { is_default: false } : {}),
  });

  // If we just deactivated the default variant, promote a successor.
  if (status === "inactive" && target.is_default && target.product_id) {
    const { data: candidates } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", target.product_id)
      .eq("status", "active")
      .is("archived_at", null)
      .neq("id", variantId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (candidates && candidates.length > 0) {
      await productRepo.setDefaultVariant(target.product_id, candidates[0].id);
    }
    // If no candidates, product has no active variants — no default to assign.
  }

  return updated;
}

