import "server-only";
import { createClient, createPublicClient } from "../supabase/server";
import type { Database } from "@/types";

export type ShippingZoneRow = Database["public"]["Tables"]["shipping_zones"]["Row"];
export type ShippingRateRow = Database["public"]["Tables"]["shipping_rates"]["Row"];
export type FulfilmentMethodRow = Database["public"]["Tables"]["fulfilment_methods"]["Row"];

export type ShippingZoneWithRates = ShippingZoneRow & { rates: ShippingRateRow[] };

export async function findShippingZones(): Promise<ShippingZoneWithRates[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("shipping_zones")
    .select("*, rates:shipping_rates(*)")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as ShippingZoneWithRates[];
}

export async function findFulfilmentMethods(): Promise<FulfilmentMethodRow[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("fulfilment_methods")
    .select("*")
    .eq("is_enabled", true);

  if (error) throw error;
  return (data || []) as unknown as FulfilmentMethodRow[];
}

export async function findFulfilmentMethodById(id: string): Promise<FulfilmentMethodRow | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("fulfilment_methods")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as unknown as FulfilmentMethodRow;
}

export async function findShippingRatesByZone(zoneId: string): Promise<ShippingRateRow[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("shipping_rates")
    .select("*")
    .eq("zone_id", zoneId);

  if (error) throw error;
  return (data || []) as unknown as ShippingRateRow[];
}

export async function findMatchingShippingZone(state?: string): Promise<ShippingZoneRow | null> {
  const supabase = createPublicClient();
  const { data: zones, error } = await supabase
    .from("shipping_zones")
    .select("*");

  if (error || !zones || zones.length === 0) return null;
  if (!state) return zones[0] ?? null;

  const normalizedState = state.trim().toLowerCase();
  const matched = zones.find((z) =>
    z.regions.some((r) => r.trim().toLowerCase() === normalizedState)
  );

  return matched ?? zones[0] ?? null;
}

export async function findShippingRateForMethodAndZone(
  fulfilmentMethodId: string,
  zoneId: string
): Promise<ShippingRateRow | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("shipping_rates")
    .select("*")
    .eq("fulfilment_method_id", fulfilmentMethodId)
    .eq("zone_id", zoneId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as ShippingRateRow;
}
