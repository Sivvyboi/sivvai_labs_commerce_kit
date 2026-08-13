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
