"use server";

/**
 * features/admin/actions/admin.actions.ts
 *
 * Typed Server Actions for all Admin Dashboard operations:
 * Products, Categories, Inventory, Orders, Customers, Promotions, and Store Settings.
 *
 * Pattern:
 * 1. Require admin access via requireAdmin() (no-op until auth enabled).
 * 2. Validate input using Zod schemas from lib/validation/admin.
 * 3. Delegate business logic to services.
 * 4. Revalidate affected path(s).
 * 5. Return standardized { success: boolean; data?: T; error?: string } result.
 */

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin-guard";

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
    await requireAdmin();
    const validated = CreateProductAdminSchema.parse(input);

    const product = await productService.createProductAdmin({
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
    });

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
    await requireAdmin();
    const validated = UpdateProductAdminSchema.parse(input);
    const { id, ...data } = validated;

    const updated = await productService.updateProductAdmin(id, {
      ...data,
      description: data.description ?? undefined,
      category_id: data.category_id ?? undefined,
      seo_title: data.seo_title ?? undefined,
      seo_description: data.seo_description ?? undefined,
    });

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
    await requireAdmin();
    const archived = await productService.archiveProductAdmin(id);
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

export async function publishProductAction(id: string) {
  try {
    await requireAdmin();
    const published = await productService.publishProduct(id);
    revalidatePath("/admin/products");
    return { success: true, product: published };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to publish product",
    };
  }
}

export async function duplicateProductAction(id: string) {
  try {
    await requireAdmin();
    const duplicate = await productService.duplicateProduct(id);
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
    await requireAdmin();
    const validated = UpdateVariantAdminSchema.parse(input);
    const updated = await productService.updateVariantAdmin(validated.id, {
      sku: validated.sku,
      price_override: validated.price_override,
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
    await requireAdmin();
    const image = await productService.addProductImage(productId, url, altText, isPrimary);
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
    await requireAdmin();
    await productService.removeProductImage(imageId);
    revalidatePath(`/admin/products/${productId}`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove image",
    };
  }
}

// ---------------------------------------------------------------------------
// 2. Category Actions
// ---------------------------------------------------------------------------

export async function createCategoryAction(input: CreateCategoryAdminInput) {
  try {
    await requireAdmin();
    const validated = CreateCategoryAdminSchema.parse(input);
    const category = await categoryService.createCategoryAdmin({
      name: validated.name,
      slug: validated.slug,
      description: validated.description ?? null,
      parent_id: validated.parent_id ?? null,
    });
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
    await requireAdmin();
    const validated = UpdateCategoryAdminSchema.parse(input);
    const { id, ...data } = validated;
    const updated = await categoryService.updateCategoryAdmin(id, {
      ...data,
      description: data.description ?? undefined,
      parent_id: data.parent_id ?? undefined,
    });
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
    await requireAdmin();
    const category = await categoryService.archiveCategoryAdmin(id);
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
    await requireAdmin();
    const category = await categoryService.restoreCategoryAdmin(id);
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
    await requireAdmin();
    const validated = UpdateInventoryAdminSchema.parse(input);
    const updated = await inventoryService.manualInventoryAdjustment({
      inventoryRecordId: validated.inventory_record_id,
      variantId: validated.variant_id,
      newQuantity: validated.new_quantity,
      reason: validated.reason,
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
    await requireAdmin();
    const validated = UpdateOrderStatusAdminSchema.parse(input);
    const updated = await (await import("@/lib/db/orders")).updateOrderStatus(validated.order_id, validated.status);
    if (validated.note) {
      await orderService.addOrderNote(validated.order_id, `Status updated to ${validated.status}: ${validated.note}`);
    }

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

// ---------------------------------------------------------------------------
// 4b. Customer Actions
// ---------------------------------------------------------------------------

export async function listCustomersAction(params?: { search?: string; limit?: number; offset?: number }) {
  try {
    await requireAdmin();
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
    await requireAdmin();
    const customer = await customerService.getCustomerProfile(id);
    return { success: true, customer };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Customer not found",
    };
  }
}

export async function addOrderNoteAction(input: AddOrderNoteAdminInput) {
  try {
    await requireAdmin();
    const validated = AddOrderNoteAdminSchema.parse(input);
    const note = await orderService.addOrderNote(
      validated.order_id,
      validated.body,
      validated.author_type === "admin"
    );
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
// 5. Promotion Actions
// ---------------------------------------------------------------------------

export async function createPromotionAction(input: CreatePromotionAdminInput) {
  try {
    await requireAdmin();
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
    await requireAdmin();
    const validated = UpdatePromotionAdminSchema.parse(input);
    const { id, ...data } = validated;
    const updated = await promotionService.updatePromotionAdmin(id, {
      ...data,
      starts_at: data.starts_at ?? undefined,
      ends_at: data.ends_at ?? undefined,
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
    await requireAdmin();
    const updated = await promotionService.togglePromotionActive(id, isActive);
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
    await requireAdmin();
    await promotionService.deletePromotionAdmin(id);
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
    await requireAdmin();
    const validated = UpdateStoreSettingsAdminSchema.parse(input);
    const settings = await storeService.updateStoreSettings(id, validated);
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
    await requireAdmin();
    const validated = UpdateBrandProfileAdminSchema.parse(input);
    const profile = await storeService.updateBrandProfile(id, {
      ...validated,
      logo_url: validated.logo_url ?? undefined,
      contact_phone: validated.contact_phone ?? undefined,
      seo_title: validated.seo_title ?? undefined,
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
    await requireAdmin();
    const validated = UpdateFeatureFlagAdminSchema.parse(input);
    const flag = await storeService.setFeatureFlag(validated.key, validated.enabled);
    revalidatePath("/admin/settings");
    return { success: true, flag };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update feature flag",
    };
  }
}
