import "server-only";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "@/types";

export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
export type OrderLineRow = Database["public"]["Tables"]["order_lines"]["Row"];
export type OrderLineInsert = Database["public"]["Tables"]["order_lines"]["Insert"];

export type OrderStatusEventRow = Database["public"]["Tables"]["order_status_events"]["Row"];
export type OrderNoteRow = Database["public"]["Tables"]["order_notes"]["Row"];

export type OrderWithLines = OrderRow & {
  lines: OrderLineRow[];
  customer?: Database["public"]["Tables"]["customers"]["Row"] | null;
  status_events?: OrderStatusEventRow[];
  notes?: OrderNoteRow[];
  payment_attempts?: Database["public"]["Tables"]["payment_attempts"]["Row"][];
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
    .select("*, lines:order_lines(*), customer:customers(*), payment_attempts(*), status_events:order_status_events(*), notes:order_notes(*)")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as OrderWithLines;
}

export async function findOrderByNumber(orderNumber: string): Promise<OrderWithLines | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, lines:order_lines(*), customer:customers(*), payment_attempts(*), status_events:order_status_events(*), notes:order_notes(*)")
    .eq("order_number", orderNumber)
    .single();

  if (error || !data) return null;
  return data as OrderWithLines;
}

export async function findOrderByNumberAndEmail(
  orderNumber: string,
  email: string
): Promise<OrderWithLines | null> {
  const order = await findOrderByNumber(orderNumber);
  if (!order) return null;

  const targetEmail = email.trim().toLowerCase();
  
  // Check customer email if associated
  const customerEmail = order.customer?.email?.toLowerCase();
  
  // Check guest contact email if guest order
  const guestEmail = (order.guest_contact as { email?: string } | null)?.email?.toLowerCase();

  if (customerEmail === targetEmail || guestEmail === targetEmail) {
    return order;
  }

  return null;
}

export async function findCustomerOrders(customerId: string): Promise<OrderWithLines[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, lines:order_lines(*), status_events:order_status_events(*)")
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

