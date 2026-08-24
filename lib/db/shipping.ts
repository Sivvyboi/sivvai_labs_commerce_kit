import "server-only";
import { createClient, createPublicClient } from "../supabase/server";
import type { Database } from "@/types";

export type ShippingZoneRow = Database["public"]["Tables"]["shipping_zones"]["Row"];
export type ShippingRateRow = Database["public"]["Tables"]["shipping_rates"]["Row"];
export type FulfilmentMethodRow = Database["public"]["Tables"]["fulfilment_methods"]["Row"];

export type ShippingZoneWithRates = ShippingZoneRow & { rates: ShippingRateRow[] };

export type ShippingZoneInsert = Database["public"]["Tables"]["shipping_zones"]["Insert"];
export type ShippingZoneUpdate = Database["public"]["Tables"]["shipping_zones"]["Update"];
export type ShippingRateInsert = Database["public"]["Tables"]["shipping_rates"]["Insert"];
export type ShippingRateUpdate = Database["public"]["Tables"]["shipping_rates"]["Update"];
export type FulfilmentMethodInsert = Database["public"]["Tables"]["fulfilment_methods"]["Insert"];
export type FulfilmentMethodUpdate = Database["public"]["Tables"]["fulfilment_methods"]["Update"];

export type ShippingRateWithMethod = ShippingRateRow & {
  fulfilment_methods: FulfilmentMethodRow | null;
};

export type ShippingZoneWithRatesAndMethods = ShippingZoneRow & {
  rates: ShippingRateWithMethod[];
};

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
    .eq("is_enabled", true)
    .order("name", { ascending: true });

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
    .select("*")
    .order("name", { ascending: true });

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

// ---------------------------------------------------------------------------
// Admin Queries & Mutations (Server-Side Authenticated Client)
// ---------------------------------------------------------------------------

export async function adminFindAllShippingZones(): Promise<ShippingZoneWithRatesAndMethods[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipping_zones")
    .select(`
      *,
      rates:shipping_rates(
        *,
        fulfilment_methods(*)
      )
    `)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as ShippingZoneWithRatesAndMethods[];
}

export async function adminFindAllFulfilmentMethods(): Promise<FulfilmentMethodRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fulfilment_methods")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as FulfilmentMethodRow[];
}

export async function adminCreateShippingZone(payload: ShippingZoneInsert): Promise<ShippingZoneRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipping_zones")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as ShippingZoneRow;
}

export async function adminUpdateShippingZone(
  id: string,
  payload: ShippingZoneUpdate
): Promise<ShippingZoneRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipping_zones")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as ShippingZoneRow;
}

export async function adminDeleteShippingZone(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shipping_zones")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function adminCreateFulfilmentMethod(
  payload: FulfilmentMethodInsert
): Promise<FulfilmentMethodRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fulfilment_methods")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as FulfilmentMethodRow;
}

export async function adminUpdateFulfilmentMethod(
  id: string,
  payload: FulfilmentMethodUpdate
): Promise<FulfilmentMethodRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fulfilment_methods")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as FulfilmentMethodRow;
}

export async function adminDeleteFulfilmentMethod(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("fulfilment_methods")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function adminUpsertShippingRate(
  payload: ShippingRateInsert
): Promise<ShippingRateRow> {
  const supabase = await createClient();

  if (payload.id) {
    const { data, error } = await supabase
      .from("shipping_rates")
      .update({
        rate_type: payload.rate_type,
        flat_amount: payload.flat_amount,
        per_kg_amount: payload.per_kg_amount,
        free_above_order_total: payload.free_above_order_total,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ShippingRateRow;
  }

  // Check if a rate for this method and zone already exists
  const existing = await findShippingRateForMethodAndZone(
    payload.fulfilment_method_id,
    payload.zone_id
  );

  if (existing) {
    const { data, error } = await supabase
      .from("shipping_rates")
      .update({
        rate_type: payload.rate_type,
        flat_amount: payload.flat_amount,
        per_kg_amount: payload.per_kg_amount,
        free_above_order_total: payload.free_above_order_total,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ShippingRateRow;
  }

  const { data, error } = await supabase
    .from("shipping_rates")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as ShippingRateRow;
}

export async function adminDeleteShippingRate(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shipping_rates")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

