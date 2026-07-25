import "server-only";
import { createClient } from "../supabase/server";
import type { Database } from "@/types";

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
