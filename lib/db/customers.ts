import "server-only";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "@/types";

export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
export type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];
export type CustomerAddressRow = Database["public"]["Tables"]["customer_addresses"]["Row"];
export type CustomerAddressInsert = Database["public"]["Tables"]["customer_addresses"]["Insert"];

export type CustomerWithAddresses = CustomerRow & { addresses: CustomerAddressRow[] };

export async function findCustomerById(id: string): Promise<CustomerWithAddresses | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*, addresses:customer_addresses(*)")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as CustomerWithAddresses;
}

export async function findCustomerByEmail(email: string): Promise<CustomerWithAddresses | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*, addresses:customer_addresses(*)")
    .eq("email", email)
    .maybeSingle();

  if (error || !data) return null;
  return data as CustomerWithAddresses;
}

export async function createCustomer(data: CustomerInsert): Promise<CustomerRow> {
  const supabase = createAdminClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .insert(data)
    .select()
    .single();

  if (error || !customer) throw error || new Error("Failed to create customer");
  return customer;
}

export async function updateCustomer(
  id: string,
  data: CustomerUpdate
): Promise<CustomerRow> {
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("customers")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) throw error || new Error("Failed to update customer");
  return updated;
}

export async function findCustomerByAuthId(authId: string): Promise<CustomerWithAddresses | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*, addresses:customer_addresses(*)")
    .eq("auth_id", authId)
    .maybeSingle();

  if (error || !data) return null;
  return data as CustomerWithAddresses;
}

export async function findCustomerAddresses(customerId: string): Promise<CustomerAddressRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addCustomerAddress(data: CustomerAddressInsert): Promise<CustomerAddressRow> {
  const supabase = await createClient();
  const { data: address, error } = await supabase
    .from("customer_addresses")
    .insert(data)
    .select()
    .single();

  if (error || !address) throw error || new Error("Failed to add customer address");
  return address;
}

export async function updateCustomerAddress(
  id: string,
  customerId: string,
  data: Partial<CustomerAddressInsert>
): Promise<CustomerAddressRow> {
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("customer_addresses")
    .update(data)
    .eq("id", id)
    .eq("customer_id", customerId)
    .select()
    .single();

  if (error || !updated) throw error || new Error("Failed to update customer address");
  return updated;
}

export async function deleteCustomerAddress(id: string, customerId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("id", id)
    .eq("customer_id", customerId);

  if (error) throw error;
  return true;
}

export async function setDefaultCustomerAddress(
  addressId: string,
  customerId: string
): Promise<CustomerAddressRow> {
  const supabase = await createClient();
  // 1. Unset existing defaults for this customer
  await supabase
    .from("customer_addresses")
    .update({ is_default: false })
    .eq("customer_id", customerId);

  // 2. Set target address to default
  const { data, error } = await supabase
    .from("customer_addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("customer_id", customerId)
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to set default address");
  return data;
}

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

export interface FindAllCustomersParams {
  search?: string;
  limit?: number;
  offset?: number;
}

export async function findAllCustomers(
  params: FindAllCustomersParams = {}
): Promise<{ data: CustomerWithAddresses[]; count: number }> {
  const supabase = createAdminClient();

  let query = supabase
    .from("customers")
    .select("*, addresses:customer_addresses(*)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params.search) {
    const term = `%${params.search.trim()}%`;
    query = query.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`);
  }

  if (params.limit) {
    const from = params.offset ?? 0;
    query = query.range(from, from + params.limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as CustomerWithAddresses[], count: count ?? 0 };
}

