import "server-only";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "@/types";

export type OrderNoteInsert = Database["public"]["Tables"]["order_notes"]["Insert"];

export interface FindAllOrdersParams {
  status?: string;
  /** ISO date string — only orders on/after this date */
  fromDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}


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

  const preparedLines: OrderLineInsert[] = await Promise.all(
    linesData.map(async (line) => {
      let imageUrl = line.image_url_snapshot;
      if (!imageUrl && line.variant_id) {
        const { data: variant } = await supabase
          .from("product_variants")
          .select("product_id")
          .eq("id", line.variant_id)
          .single();

        if (variant?.product_id) {
          const { data: img } = await supabase
            .from("product_images")
            .select("url")
            .eq("product_id", variant.product_id)
            .order("is_primary", { ascending: false })
            .order("display_order", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (img?.url) {
            imageUrl = img.url;
          }
        }
      }

      return {
        ...line,
        image_url_snapshot: imageUrl ?? null,
        order_id: order.id,
      };
    })
  );

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
  return (data as unknown) as OrderWithLines;
}

export async function findOrderByNumber(orderNumber: string): Promise<OrderWithLines | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, lines:order_lines(*), customer:customers(*), payment_attempts(*), status_events:order_status_events(*), notes:order_notes(*)")
    .eq("order_number", orderNumber)
    .single();

  if (error || !data) return null;
  return (data as unknown) as OrderWithLines;
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

/**
 * Finds the confirmed order associated with a checkout session.
 *
 * The orders table has no direct FK to checkout_sessions.
 * The link is through payment_attempts.metadata->>'checkoutSessionId',
 * which is written by payment-service.ts during payment initiation.
 * Once confirmed, payment_attempts.order_id is set.
 *
 * Uses the server Supabase client (RLS-gated, never service-role).
 */
export async function findOrderByCheckoutSessionId(
  checkoutSessionId: string
): Promise<OrderWithLines | null> {
  const supabase = await createClient();

  // Fetch recent confirmed payment attempts with metadata to match on session ID.
  // We filter in JS because metadata is jsonb without an index on the nested field.
  const { data: attempts, error } = await supabase
    .from("payment_attempts")
    .select("order_id, metadata")
    .eq("status", "confirmed")
    .not("order_id", "is", null)
    .order("confirmed_at", { ascending: false });

  if (error || !attempts) return null;

  const matched = attempts.find((pa) => {
    if (!pa.metadata || typeof pa.metadata !== "object") return false;
    const meta = pa.metadata as Record<string, unknown>;
    return meta.checkoutSessionId === checkoutSessionId;
  });

  if (!matched?.order_id) return null;
  return findOrderById(matched.order_id);
}

export async function findCustomerOrders(customerId: string): Promise<OrderWithLines[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, lines:order_lines(*), status_events:order_status_events(*)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data || []) as unknown) as OrderWithLines[];
}

export async function updateOrderStatus(
  id: string,
  status: string,
  eventData?: { actor?: string; note?: string | null }
): Promise<OrderRow> {
  const supabase = createAdminClient();

  // Fetch previous status to record transition
  const { data: current } = await supabase
    .from("orders")
    .select("status")
    .eq("id", id)
    .single();

  const fromStatus = current?.status ?? status;

  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to update order status");

  // Record status event in order_status_events
  await supabase.from("order_status_events").insert({
    order_id: id,
    from_status: fromStatus,
    to_status: status,
    actor: eventData?.actor ?? "admin",
    note: eventData?.note ?? null,
  });

  return data;
}

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

export async function findAllOrders(
  params: FindAllOrdersParams = {}
): Promise<{ data: OrderWithLines[]; count: number }> {
  const supabase = createAdminClient();

  let query = supabase
    .from("orders")
    .select(
      "*, lines:order_lines(*), customer:customers(*), payment_attempts(*), status_events:order_status_events(*), notes:order_notes(*)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.fromDate) {
    query = query.gte("created_at", params.fromDate);
  }

  if (params.search) {
    query = query.ilike("order_number", `%${params.search.trim()}%`);
  }

  if (params.limit) {
    const from = params.offset ?? 0;
    query = query.range(from, from + params.limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    data: ((data ?? []) as unknown) as OrderWithLines[],
    count: count ?? 0,
  };
}

export async function insertOrderNote(
  data: OrderNoteInsert
): Promise<Database["public"]["Tables"]["order_notes"]["Row"]> {
  const supabase = createAdminClient();
  const { data: note, error } = await supabase
    .from("order_notes")
    .insert(data)
    .select()
    .single();


  if (error || !note) throw error || new Error("Failed to insert order note");
  return note;
}

/** Returns total revenue and order count for all non-cancelled orders */
export async function getRevenueStats(): Promise<{ totalRevenue: number; totalOrders: number }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("grand_total, status")
    .not("status", "in", '(cancelled,refunded)');

  if (error) throw error;
  const totalRevenue = (data ?? []).reduce((sum, o) => sum + (o.grand_total ?? 0), 0);
  return { totalRevenue, totalOrders: (data ?? []).length };
}

/** Returns count of orders created today (UTC midnight → now) */
export async function getTodayOrderCount(): Promise<number> {
  const supabase = createAdminClient();
  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .gte("created_at", todayMidnight.toISOString());

  if (error) throw error;
  return count ?? 0;
}
