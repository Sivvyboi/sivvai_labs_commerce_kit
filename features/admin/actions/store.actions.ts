"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requirePermission } from "@/lib/auth/admin-guard";
import { logAuditEvent } from "@/services/authz-service";
import * as storeService from "@/services/store-service";
import {
  UpdateStoreSettingsAdminSchema,
  UpdateBrandProfileAdminSchema,
  UpdateFeatureFlagAdminSchema,
  type UpdateStoreSettingsAdminInput,
  type UpdateBrandProfileAdminInput,
  type UpdateFeatureFlagAdminInput,
} from "@/lib/validation/admin";

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
