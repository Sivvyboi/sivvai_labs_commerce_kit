import "server-only";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "@/types";

export type StoreSettingsUpdate = Database["public"]["Tables"]["store_settings"]["Update"];
export type BrandProfileUpdate = Database["public"]["Tables"]["brand_profile"]["Update"];


export type StoreSettingsRow = Database["public"]["Tables"]["store_settings"]["Row"];
export type BrandProfileRow = Database["public"]["Tables"]["brand_profile"]["Row"];
export type FeatureFlagRow = Database["public"]["Tables"]["feature_flags"]["Row"];

export async function getStoreSettings(): Promise<StoreSettingsRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data as unknown as StoreSettingsRow;
}

export async function getBrandProfile(): Promise<BrandProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_profile")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data as unknown as BrandProfileRow;
}

export async function getFeatureFlags(): Promise<FeatureFlagRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("*");

  if (error) throw error;
  return (data || []) as unknown as FeatureFlagRow[];
}

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

export async function updateStoreSettings(id: string, data: StoreSettingsUpdate): Promise<StoreSettingsRow> {
  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from("store_settings")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) throw error || new Error("Failed to update store settings");
  return updated as unknown as StoreSettingsRow;
}

export async function updateBrandProfile(id: string, data: BrandProfileUpdate): Promise<BrandProfileRow> {
  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from("brand_profile")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) throw error || new Error("Failed to update brand profile");
  return updated as unknown as BrandProfileRow;
}

export async function upsertFeatureFlag(key: string, enabled: boolean): Promise<FeatureFlagRow> {
  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from("feature_flags")
    .upsert({ key, enabled }, { onConflict: "key" })
    .select()
    .single();

  if (error || !updated) throw error || new Error("Failed to update feature flag");
  return updated as unknown as FeatureFlagRow;
}

