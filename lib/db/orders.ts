import "server-only";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "@/types";

export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
export type OrderLineRow = Database["public"]["Tables"]["order_lines"]["Row"];
export type OrderLineInsert = Database["public"]["Tables"]["order_lines"]["Insert"];

export type OrderWithLines = OrderRow & {
  lines: OrderLineRow[];
};

export async function createOrder(
  orderData: OrderInsert,
  linesData: Array<Omit<OrderLineInsert, "order_id">>
): Promise<OrderWithLines> {
  const supabase = createAdminClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert(orderData)
    .select()
    .single();

  if (orderError || !order) throw orderError || new Error("Failed to create order");

  const preparedLines: OrderLineInsert[] = linesData.map((line) => ({
    ...line,
    order_id: order.id,
  }));

  const { data: lines, error: linesError } = await supabase
    .from("order_lines")
    .insert(preparedLines)
    .select();

  if (linesError || !lines) throw linesError || new Error("Failed to create order lines");

  return {
    ...order,
    lines,
  };
}

export async function findOrderById(id: string): Promise<OrderWithLines | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, lines:order_lines(*), customer:customers(*), payment_attempts(*)")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as OrderWithLines;
}

export async function findOrderByNumber(orderNumber: string): Promise<OrderWithLines | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, lines:order_lines(*), customer:customers(*), payment_attempts(*)")
    .eq("order_number", orderNumber)
    .single();

  if (error || !data) return null;
  return data as OrderWithLines;
}

export async function findCustomerOrders(customerId: string): Promise<OrderWithLines[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, lines:order_lines(*)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as OrderWithLines[];
}

export async function updateOrderStatus(id: string, status: string): Promise<OrderRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to update order status");
  return data;
}
