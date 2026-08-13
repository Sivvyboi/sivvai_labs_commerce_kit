"use server";

/**
 * features/admin/actions/product.actions.ts
 *
 * Typed Server Actions for Admin Product Catalog operations.
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { requirePermission } from "@/lib/auth/admin-guard";
import { logAuditEvent } from "@/services/authz-service";

import * as productService from "@/services/product-service";
import {
  CreateProductAdminSchema,
  UpdateProductAdminSchema,
  UpdateProductMetadataSchema,
  UpdateVariantAdminSchema,
  type CreateProductAdminInput,
  type UpdateProductAdminInput,
  type UpdateVariantAdminInput,
} from "@/lib/validation/admin";
import { createClient } from "@/lib/supabase/server";

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
        status: validated.status ?? "draft",
        base_price: validated.base_price,
        sale_price: validated.sale_price ?? null,
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
    const validated = UpdateProductMetadataSchema.parse(input);
    const { id, ...data } = validated;

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
    const message = err instanceof Error ? err.message : "Failed to update product";
    const isSlugConflict = message.includes("products_slug_key") || message.includes("duplicate key value violates unique constraint");
    return {
      success: false,
      error: isSlugConflict ? "This slug is already in use by another product." : message,
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

export async function addProductImageAction(
  productId: string,
  url: string,
  altText?: string,
  isPrimary = false
) {
  try {
    await requirePermission("manage_products");
    const image = await productService.addProductImage(productId, url, altText, isPrimary);

    await logAuditEvent({
      action: "product_image.add",
      entityType: "product",
      entityId: productId,
    });

    revalidateTag("catalog", "default");
    revalidatePath("/", "layout");
    revalidatePath(`/admin/products/${productId}`);
    return { success: true, image };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add product image",
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

export async function updateVariantAction(input: UpdateVariantAdminInput, productId?: string) {
  try {
    await requirePermission("manage_products");
    const validated = UpdateVariantAdminSchema.parse(input);
    const { id, ...rest } = validated;
    const variant = await productService.updateVariantAdmin(id, rest);
    revalidateTag("catalog", "default");
    revalidatePath("/", "layout");
    if (productId) {
      revalidatePath(`/admin/products/${productId}`);
    }
    return { success: true, variant };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update variant",
    };
  }
}

