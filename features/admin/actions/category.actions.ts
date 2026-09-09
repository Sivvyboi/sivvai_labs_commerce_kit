"use server";

/**
 * features/admin/actions/category.actions.ts
 *
 * Typed Server Actions for Admin Category operations.
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { requirePermission } from "@/lib/auth/admin-guard";
import { logAuditEvent } from "@/services/authz-service";

import * as categoryService from "@/services/category-service";
import {
  CreateCategoryAdminSchema,
  UpdateCategoryAdminSchema,
  type CreateCategoryAdminInput,
  type UpdateCategoryAdminInput,
} from "@/lib/validation/admin";

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
      og_image: data.og_image ?? undefined,
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
// Image Management
// ---------------------------------------------------------------------------

/**
 * Generates a short-lived signed upload URL for a category image.
 * The client uploads directly to Supabase Storage using this URL,
 * then saves the resulting publicUrl via updateCategoryAction.
 */
export async function generateCategoryImageUploadUrlAction(params: {
  filename: string;
  contentType: string;
}) {
  try {
    await requirePermission("manage_categories");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowedTypes.includes(params.contentType)) {
      throw new Error(
        `File type ${params.contentType} is not allowed. Use jpeg, png, webp, or avif.`
      );
    }

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const cleanFilename = params.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `public/${Date.now()}-${cleanFilename}`;

    const { data, error } = await supabase.storage
      .from("category-images")
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      throw new Error(`Failed to create signed upload URL: ${error?.message}`);
    }

    const publicUrlData = supabase.storage
      .from("category-images")
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

/**
 * Removes a category image:
 * 1. Deletes the object from the category-images storage bucket.
 * 2. Clears og_image on the category row.
 */
export async function removeCategoryImageAction(categoryId: string, imageUrl: string) {
  try {
    await requirePermission("manage_categories");

    // Extract the storage path from the public URL
    const bucketMarker = "/category-images/";
    const markerIdx = imageUrl.indexOf(bucketMarker);
    if (markerIdx !== -1) {
      const storagePath = decodeURIComponent(
        imageUrl.slice(markerIdx + bucketMarker.length)
      );
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const adminClient = createAdminClient();
      const { error: storageError } = await adminClient.storage
        .from("category-images")
        .remove([storagePath]);

      if (storageError) {
        console.error("[removeCategoryImageAction] Storage removal failed:", storageError.message);
        // Non-fatal — proceed to clear the DB reference
      }
    }

    // Clear the og_image field on the category
    await categoryService.updateCategoryAdmin(categoryId, { og_image: null });

    await logAuditEvent({
      action: "category.image_remove",
      entityType: "category",
      entityId: categoryId,
    });

    revalidateTag("catalog", "default");
    revalidatePath("/admin/categories");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove category image",
    };
  }
}
