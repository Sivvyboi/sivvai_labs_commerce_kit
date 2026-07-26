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

export async function findCustomerAddresses(customerId: string): Promise<CustomerAddressRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("customer_id", customerId);

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
