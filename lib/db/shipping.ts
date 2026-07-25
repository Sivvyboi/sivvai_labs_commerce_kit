import "server-only";
import { createClient } from "../supabase/server";
import type { Database } from "@/types";

export type ShippingZoneRow = Database["public"]["Tables"]["shipping_zones"]["Row"];
export type ShippingRateRow = Database["public"]["Tables"]["shipping_rates"]["Row"];
export type FulfilmentMethodRow = Database["public"]["Tables"]["fulfilment_methods"]["Row"];

export type ShippingZoneWithRates = ShippingZoneRow & { rates: ShippingRateRow[] };

export async function findShippingZones(): Promise<ShippingZoneWithRates[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipping_zones")
    .select("*, rates:shipping_rates(*)")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as ShippingZoneWithRates[];
}

export async function findFulfilmentMethods(): Promise<FulfilmentMethodRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fulfilment_methods")
    .select("*")
    .eq("is_enabled", true);

  if (error) throw error;
  return (data || []) as unknown as FulfilmentMethodRow[];
}

export async function findFulfilmentMethodById(id: string): Promise<FulfilmentMethodRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fulfilment_methods")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as unknown as FulfilmentMethodRow;
}

export async function findShippingRatesByZone(zoneId: string): Promise<ShippingRateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipping_rates")
    .select("*")
    .eq("zone_id", zoneId);

  if (error) throw error;
  return (data || []) as unknown as ShippingRateRow[];
}
