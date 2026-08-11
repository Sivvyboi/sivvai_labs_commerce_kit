"use server";

/**
 * features/admin/actions/admin.actions.ts
 *
 * Typed Server Actions for all Admin Dashboard operations:
 * Products, Categories, Inventory, Orders, Customers, Promotions, and Store Settings.
 *
 * Pattern:
 * 1. Enforce RBAC permission via requirePermission("manage_x").
 * 2. Validate input using Zod schemas from lib/validation/admin.
 * 3. Delegate business logic to services.
 * 4. Log audit event via logAuditEvent().
 * 5. Revalidate affected path(s).
 * 6. Return standardized { success: boolean; data?: T; error?: string } result.
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { requirePermission } from "@/lib/auth/admin-guard";
import { logAuditEvent } from "@/services/authz-service";
import { createClient } from "@/lib/supabase/server";

import * as productService from "@/services/product-service";
import * as categoryService from "@/services/category-service";
import * as inventoryService from "@/services/inventory-service";
import * as orderService from "@/services/order-service";
import * as customerService from "@/services/customer-service";
import * as promotionService from "@/services/promotion-service";
import * as storeService from "@/services/store-service";

import {
  CreateProductAdminSchema,
  UpdateProductAdminSchema,
  UpdateVariantAdminSchema,
  CreateCategoryAdminSchema,
  UpdateCategoryAdminSchema,
  UpdateInventoryAdminSchema,
  UpdateOrderStatusAdminSchema,
  AddOrderNoteAdminSchema,
  CreatePromotionAdminSchema,
  UpdatePromotionAdminSchema,
  UpdateStoreSettingsAdminSchema,
  UpdateBrandProfileAdminSchema,
  UpdateFeatureFlagAdminSchema,
  type CreateProductAdminInput,
  type UpdateProductAdminInput,
  type UpdateVariantAdminInput,
  type CreateCategoryAdminInput,
  type UpdateCategoryAdminInput,
  type UpdateInventoryAdminInput,
  type UpdateOrderStatusAdminInput,
  type AddOrderNoteAdminInput,
  type CreatePromotionAdminInput,
  type UpdatePromotionAdminInput,
  type UpdateStoreSettingsAdminInput,
  type UpdateBrandProfileAdminInput,
  type UpdateFeatureFlagAdminInput,
} from "@/lib/validation/admin";

// ---------------------------------------------------------------------------
// 1. Products Actions
// ---------------------------------------------------------------------------

export async function createProductAction(input: CreateProductAdminInput) {
  try {
    await requirePermission("manage_products");
    const validated = CreateProductAdminSchema.parse(input);

    const product = await productService.createProductAdmin(
      {
        name: validated.name,
        slug: validated.slug,
        description: validated.description ?? null,
        category_id: validated.category_id ?? null,
        status: validated.status,
        base_price: validated.base_price,
        sale_price: validated.sale_price ?? null,
        compare_at_price: validated.compare_at_price ?? null,
        cost_price: validated.cost_price ?? null,
        is_featured: validated.is_featured,
        seo_title: validated.seo_title ?? null,
        seo_description: validated.seo_description ?? null,
      },
      validated.initial_stock ?? 0,
      validated.sku ?? undefined
    );

    await logAuditEvent({
      action: "product.create",
      entityType: "product",
      entityId: product.id,
      metadata: { name: product.name, slug: product.slug },
    });

    revalidateTag("catalog", "default");
    revalidatePath("/", "layout");
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    return { success: true, product };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create product",
    };
  }
}

export async function updateProductAction(input: UpdateProductAdminInput) {
  try {
    await requirePermission("manage_products");
    const validated = UpdateProductAdminSchema.parse(input);
    // Destructure out cost_price — it is not a column on the products table
    // (it is a front-end-only field used to derive margin) and passing it to
    // the DB causes a 400 column-not-found error.
    const { id, cost_price: _cost, ...data } = validated;

    const updated = await productService.updateProductAdmin(id, {
      ...data,
      description: data.description ?? undefined,
      category_id: data.category_id ?? undefined,
      seo_title: data.seo_title ?? undefined,
      seo_description: data.seo_description ?? undefined,
    });

    await logAuditEvent({
      action: "product.update",
      entityType: "product",
      entityId: id,
    });

    revalidateTag("catalog", "default");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/admin/products");
    return { success: true, product: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update product",
    };
  }
}

export async function archiveProductAction(id: string) {
  try {
    await requirePermission("manage_products");
    const archived = await productService.archiveProductAdmin(id);

    await logAuditEvent({
      action: "product.archive",
      entityType: "product",
      entityId: id,
    });

    revalidateTag("catalog", "default");
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    return { success: true, product: archived };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to archive product",
    };
  }
}

export async function restoreProductAction(id: string) {
  try {
    await requirePermission("manage_products");
    const restored = await productService.restoreProduct(id);

    await logAuditEvent({
      action: "product.restore",
      entityType: "product",
      entityId: id,
    });

    revalidateTag("catalog", "default");
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    return { success: true, product: restored };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to restore product",
    };
  }
}

export async function publishProductAction(id: string) {
  try {
    await requirePermission("manage_products");
    const published = await productService.publishProduct(id);

    await logAuditEvent({
      action: "product.publish",
      entityType: "product",
      entityId: id,
    });

    revalidateTag("catalog", "default");
    revalidatePath("/", "layout");
    revalidatePath("/admin/products");
    return { success: true, product: published };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to publish product",
    };
  }
}

export async function unpublishProductAction(id: string) {
  try {
    await requirePermission("manage_products");
    const unpublished = await productService.unpublishProduct(id);

    await logAuditEvent({
      action: "product.unpublish",
      entityType: "product",
      entityId: id,
    });

    revalidateTag("catalog", "default");
    revalidatePath("/", "layout");
    revalidatePath("/admin/products");
    return { success: true, product: unpublished };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to unpublish product",
    };
  }
}

export async function duplicateProductAction(id: string) {
  try {
    await requirePermission("manage_products");
    const duplicate = await productService.duplicateProduct(id);

    await logAuditEvent({
      action: "product.duplicate",
      entityType: "product",
      entityId: duplicate.id,
      metadata: { original_id: id },
    });

    revalidateTag("catalog", "default");
    revalidatePath("/admin/products");
    return { success: true, product: duplicate };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to duplicate product",
    };
  }
}

export async function updateVariantAction(input: UpdateVariantAdminInput) {
  try {
    await requirePermission("manage_products");
    const validated = UpdateVariantAdminSchema.parse(input);
    const updated = await productService.updateVariantAdmin(validated.id, {
      sku: validated.sku,
      price_override: validated.price_override,
    });

    await logAuditEvent({
      action: "variant.update",
      entityType: "product_variant",
      entityId: validated.id,
    });

    revalidatePath("/admin/products");
    return { success: true, variant: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update variant",
    };
  }
}

export async function addProductImageAction(productId: string, url: string, altText?: string, isPrimary = false) {
  try {
    await requirePermission("manage_products");
    const image = await productService.addProductImage(productId, url, altText, isPrimary);

    await logAuditEvent({
      action: "product_image.add",
      entityType: "product",
      entityId: productId,
    });

    revalidatePath(`/admin/products/${productId}`);
    return { success: true, image };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add image",
    };
  }
}

export async function removeProductImageAction(imageId: string, productId: string) {
  try {
    await requirePermission("manage_products");
    await productService.removeProductImage(imageId);

    await logAuditEvent({
      action: "product_image.remove",
      entityType: "product",
      entityId: productId,
    });

    revalidateTag("catalog", "default");
    revalidatePath("/", "layout");
    revalidatePath(`/admin/products/${productId}`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove image",
    };
  }
}

export async function createOptionGroupAction(productId: string, name: string) {
  try {
    await requirePermission("manage_products");
    const group = await productService.createOptionGroup(productId, name);
    revalidateTag("catalog", "default");
    revalidatePath("/", "layout");
    revalidatePath(`/admin/products/${productId}`);
    return { success: true, group };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create option group",
    };
  }
}

export async function deleteOptionGroupAction(groupId: string, productId: string) {
  try {
    await requirePermission("manage_products");
    await productService.deleteOptionGroup(groupId);
    revalidateTag("catalog", "default");
    revalidatePath("/", "layout");
    revalidatePath(`/admin/products/${productId}`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete option group",
    };
  }
}

export async function addOptionValueAction(optionGroupId: string, label: string, productId: string) {
  try {
    await requirePermission("manage_products");
    const value = await productService.addOptionValue(optionGroupId, label);
    revalidateTag("catalog", "default");
    revalidatePath("/", "layout");
    revalidatePath(`/admin/products/${productId}`);
    return { success: true, value };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add option value",
    };
  }
}

export async function deleteOptionValueAction(valueId: string, productId: string) {
  try {
    await requirePermission("manage_products");
    await productService.deleteOptionValue(valueId);
    revalidateTag("catalog", "default");
    revalidatePath("/", "layout");
    revalidatePath(`/admin/products/${productId}`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete option value",
    };
  }
}

// ---------------------------------------------------------------------------
// 2. Category Actions
// ---------------------------------------------------------------------------

export async function createCategoryAction(input: CreateCategoryAdminInput) {
  try {
    await requirePermission("manage_categories");
    const validated = CreateCategoryAdminSchema.parse(input);
    const category = await categoryService.createCategoryAdmin({
      name: validated.name,
      slug: validated.slug,
      description: validated.description ?? null,
      parent_id: validated.parent_id ?? null,
    });

    await logAuditEvent({
      action: "category.create",
      entityType: "category",
      entityId: category.id,
    });

    revalidateTag("catalog", "default");
    revalidatePath("/admin/categories");
    return { success: true, category };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create category",
    };
  }
}

export async function updateCategoryAction(input: UpdateCategoryAdminInput) {
  try {
    await requirePermission("manage_categories");
    const validated = UpdateCategoryAdminSchema.parse(input);
    const { id, ...data } = validated;
    const updated = await categoryService.updateCategoryAdmin(id, {
      ...data,
      description: data.description ?? undefined,
      parent_id: data.parent_id ?? undefined,
    });

    await logAuditEvent({
      action: "category.update",
      entityType: "category",
      entityId: id,
    });

    revalidateTag("catalog", "default");
    revalidatePath("/admin/categories");
    return { success: true, category: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update category",
    };
  }
}

export async function archiveCategoryAction(id: string) {
  try {
    await requirePermission("manage_categories");
    const category = await categoryService.archiveCategoryAdmin(id);

    await logAuditEvent({
      action: "category.archive",
      entityType: "category",
      entityId: id,
    });

    revalidateTag("catalog", "default");
    revalidatePath("/admin/categories");
    return { success: true, category };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to archive category",
    };
  }
}

export async function restoreCategoryAction(id: string) {
  try {
    await requirePermission("manage_categories");
    const category = await categoryService.restoreCategoryAdmin(id);

    await logAuditEvent({
      action: "category.restore",
      entityType: "category",
      entityId: id,
    });

    revalidateTag("catalog", "default");
    revalidatePath("/admin/categories");
    return { success: true, category };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to restore category",
    };
  }
}

// ---------------------------------------------------------------------------
// 3. Inventory Actions
// ---------------------------------------------------------------------------

export async function updateInventoryAction(input: UpdateInventoryAdminInput) {
  try {
    await requirePermission("manage_inventory");
    const validated = UpdateInventoryAdminSchema.parse(input);
    const updated = await inventoryService.manualInventoryAdjustment({
      inventoryRecordId: validated.inventory_record_id,
      variantId: validated.variant_id,
      newQuantity: validated.new_quantity,
      reason: validated.reason,
    });

    await logAuditEvent({
      action: "inventory.adjust",
      entityType: "inventory_record",
      entityId: validated.inventory_record_id,
      metadata: { new_quantity: validated.new_quantity, reason: validated.reason },
    });

    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    return { success: true, inventory: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to adjust inventory",
    };
  }
}

// ---------------------------------------------------------------------------
// 4. Order Actions
// ---------------------------------------------------------------------------

export async function updateOrderStatusAction(input: UpdateOrderStatusAdminInput) {
  try {
    await requirePermission("manage_orders");
    const validated = UpdateOrderStatusAdminSchema.parse(input);
    const updated = await (await import("@/lib/db/orders")).updateOrderStatus(validated.order_id, validated.status);
    if (validated.note) {
      await orderService.addOrderNote(validated.order_id, `Status updated to ${validated.status}: ${validated.note}`);
    }

    await logAuditEvent({
      action: "order.update_status",
      entityType: "order",
      entityId: validated.order_id,
      metadata: { new_status: validated.status },
    });

    revalidatePath(`/admin/orders/${validated.order_id}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return { success: true, order: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update order status",
    };
  }
}

export async function addOrderNoteAction(input: AddOrderNoteAdminInput) {
  try {
    await requirePermission("manage_orders");
    const validated = AddOrderNoteAdminSchema.parse(input);
    const note = await orderService.addOrderNote(
      validated.order_id,
      validated.body,
      validated.author_type === "admin"
    );

    await logAuditEvent({
      action: "order.add_note",
      entityType: "order",
      entityId: validated.order_id,
    });

    revalidatePath(`/admin/orders/${validated.order_id}`);
    return { success: true, note };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add note",
    };
  }
}

// ---------------------------------------------------------------------------
// 4b. Customer Actions
// ---------------------------------------------------------------------------

export async function listCustomersAction(params?: { search?: string; limit?: number; offset?: number }) {
  try {
    await requirePermission("view_customers");
    const result = await customerService.getAllCustomers(params);
    return { success: true, ...result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to list customers",
    };
  }
}

export async function getCustomerAction(id: string) {
  try {
    await requirePermission("view_customers");
    const customer = await customerService.getCustomerProfile(id);
    return { success: true, customer };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Customer not found",
    };
  }
}

// ---------------------------------------------------------------------------
// 5. Promotion Actions
// ---------------------------------------------------------------------------

export async function createPromotionAction(input: CreatePromotionAdminInput) {
  try {
    await requirePermission("manage_promotions");
    const validated = CreatePromotionAdminSchema.parse(input);
    const promotion = await promotionService.createPromotionAdmin(
      {
        name: validated.name,
        type: validated.type,
        value: validated.value,
        starts_at: validated.starts_at ?? null,
        ends_at: validated.ends_at ?? null,
        is_active: validated.is_active,
      },
      validated.code,
      validated.max_uses ?? null
    );

    await logAuditEvent({
      action: "promotion.create",
      entityType: "promotion",
      entityId: promotion.id,
      metadata: { code: validated.code },
    });

    revalidatePath("/admin/promotions");
    revalidatePath("/admin");
    return { success: true, promotion };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create promotion",
    };
  }
}

export async function updatePromotionAction(input: UpdatePromotionAdminInput) {
  try {
    await requirePermission("manage_promotions");
    const validated = UpdatePromotionAdminSchema.parse(input);
    const { id, ...data } = validated;
    const updated = await promotionService.updatePromotionAdmin(id, {
      ...data,
      starts_at: data.starts_at ?? undefined,
      ends_at: data.ends_at ?? undefined,
    });

    await logAuditEvent({
      action: "promotion.update",
      entityType: "promotion",
      entityId: id,
    });

    revalidatePath("/admin/promotions");
    return { success: true, promotion: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update promotion",
    };
  }
}

export async function togglePromotionActiveAction(id: string, isActive: boolean) {
  try {
    await requirePermission("manage_promotions");
    const updated = await promotionService.togglePromotionActive(id, isActive);

    await logAuditEvent({
      action: "promotion.toggle_active",
      entityType: "promotion",
      entityId: id,
      metadata: { is_active: isActive },
    });

    revalidatePath("/admin/promotions");
    revalidatePath("/admin");
    return { success: true, promotion: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle promotion state",
    };
  }
}

export async function deletePromotionAction(id: string) {
  try {
    await requirePermission("manage_promotions");
    await promotionService.deletePromotionAdmin(id);

    await logAuditEvent({
      action: "promotion.delete",
      entityType: "promotion",
      entityId: id,
    });

    revalidatePath("/admin/promotions");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete promotion",
    };
  }
}

// ---------------------------------------------------------------------------
// 6. Settings Actions
// ---------------------------------------------------------------------------

export async function updateStoreSettingsAction(id: string, input: UpdateStoreSettingsAdminInput) {
  try {
    await requirePermission("manage_settings");
    const validated = UpdateStoreSettingsAdminSchema.parse(input);
    const settings = await storeService.updateStoreSettings(id, validated);

    await logAuditEvent({
      action: "store_settings.update",
      entityType: "store_settings",
      entityId: id,
    });

    revalidateTag("store_settings", "default");
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { success: true, settings };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update store settings",
    };
  }
}

export async function updateBrandProfileAction(id: string, input: UpdateBrandProfileAdminInput) {
  try {
    await requirePermission("manage_settings");
    const validated = UpdateBrandProfileAdminSchema.parse(input);
    const profile = await storeService.updateBrandProfile(id, {
      ...validated,
      logo_url: validated.logo_url ?? undefined,
      contact_phone: validated.contact_phone ?? undefined,
      seo_title: validated.seo_title ?? undefined,
    });

    await logAuditEvent({
      action: "brand_profile.update",
      entityType: "brand_profile",
      entityId: id,
    });

    revalidatePath("/admin/settings");
    return { success: true, profile };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update brand profile",
    };
  }
}

export async function updateFeatureFlagAction(input: UpdateFeatureFlagAdminInput) {
  try {
    await requirePermission("manage_settings");
    const validated = UpdateFeatureFlagAdminSchema.parse(input);
    const flag = await storeService.setFeatureFlag(validated.key, validated.enabled);

    await logAuditEvent({
      action: "feature_flag.update",
      entityType: "feature_flag",
      entityId: validated.key,
      metadata: { enabled: validated.enabled },
    });

    revalidatePath("/admin/settings");
    return { success: true, flag };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update feature flag",
    };
  }
}

export async function generateProductImageUploadUrlAction(params: {
  filename: string;
  contentType: string;
}) {
  try {
    await requirePermission("manage_products");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowedTypes.includes(params.contentType)) {
      throw new Error(
        `File type ${params.contentType} is not allowed. Allowed types: jpeg, png, webp, avif`
      );
    }

    const supabase = await createClient();
    const cleanFilename = params.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `public/${Date.now()}-${cleanFilename}`;

    const { data, error } = await supabase.storage
      .from("product-images")
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      throw new Error(`Failed to create signed upload URL: ${error?.message}`);
    }

    const publicUrlData = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return {
      success: true,
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: publicUrlData.data.publicUrl,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate upload URL",
    };
  }
}
