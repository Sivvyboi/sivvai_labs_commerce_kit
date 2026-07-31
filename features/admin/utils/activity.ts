import "server-only";

/**
 * features/admin/utils/activity.ts
 *
 * System activity log utility.
 * Synthesizes an operational activity feed from existing database records:
 *  - Order status updates (`order_status_events` / `orders`)
 *  - Stock movements (`stock_movements`)
 *  - Internal order notes (`order_notes`)
 *  - Customer registrations (`customers`)
 *
 * Provides valuable merchant visibility without introducing schema redesign.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface ActivityItem {
  id: string;
  type: "order" | "stock" | "note" | "customer";
  title: string;
  description: string;
  timestamp: string;
  badge: {
    label: string;
    variant: "info" | "warning" | "success" | "neutral";
  };
  link?: string;
}

interface StockMovementWithRelation {
  id: string;
  movement_type: string;
  quantity_delta: number;
  reason: string | null;
  created_at: string;
  inventory?: {
    variant?: {
      product?: {
        name?: string;
      };
    };
  };
}

interface OrderNoteWithRelation {
  id: string;
  order_id: string;
  body: string;
  author_type: string;
  created_at: string;
  order?: {
    order_number?: string;
  };
}

export async function getSystemActivityFeed(limit = 30): Promise<ActivityItem[]> {
  const supabase = createAdminClient();

  const [
    { data: orders },
    { data: movements },
    { data: notes },
    { data: customers },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, grand_total, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("stock_movements")
      .select("id, movement_type, quantity_delta, reason, created_at, inventory:inventory_records(variant:product_variants(product:products(name)))")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("order_notes")
      .select("id, order_id, body, author_type, created_at, order:orders(order_number)")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("customers")
      .select("id, first_name, last_name, email, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const items: ActivityItem[] = [];

  // 1. Order Activity
  (orders ?? []).forEach((o) => {
    const formattedAmount = o.grand_total ? `₦${(o.grand_total / 100).toLocaleString("en-NG")}` : "";
    items.push({
      id: `order-${o.id}`,
      type: "order",
      title: `Order ${o.order_number} ${o.status}`,
      description: `Grand Total: ${formattedAmount}`,
      timestamp: o.created_at,
      badge: {
        label: o.status.toUpperCase(),
        variant: o.status === "completed" || o.status === "delivered" ? "success" : "info",
      },
      link: `/admin/orders/${o.id}`,
    });
  });

  // 2. Stock Movements
  ((movements as unknown as StockMovementWithRelation[]) ?? []).forEach((m) => {
    const productName = m.inventory?.variant?.product?.name ?? "Product Variant";
    const deltaStr = m.quantity_delta > 0 ? `+${m.quantity_delta}` : `${m.quantity_delta}`;

    items.push({
      id: `stock-${m.id}`,
      type: "stock",
      title: `Stock ${m.movement_type}: ${productName}`,
      description: `Quantity delta: ${deltaStr} units (${m.reason ?? "general"})`,
      timestamp: m.created_at,
      badge: {
        label: (m.movement_type ?? "movement").toUpperCase(),
        variant: m.quantity_delta > 0 ? "success" : "warning",
      },
      link: "/admin/inventory",
    });
  });

  // 3. Order Notes
  ((notes as unknown as OrderNoteWithRelation[]) ?? []).forEach((n) => {
    const orderNum = n.order?.order_number ?? "Order";

    items.push({
      id: `note-${n.id}`,
      type: "note",
      title: `Internal Note on ${orderNum}`,
      description: n.body,
      timestamp: n.created_at,
      badge: {
        label: (n.author_type ?? "admin").toUpperCase(),
        variant: "neutral",
      },
      link: `/admin/orders/${n.order_id}`,
    });
  });

  // 4. Customer Registrations
  (customers ?? []).forEach((c) => {
    const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email;
    items.push({
      id: `customer-${c.id}`,
      type: "customer",
      title: `New Customer Registered`,
      description: `${name} (${c.email})`,
      timestamp: c.created_at,
      badge: {
        label: "REGISTERED",
        variant: "info",
      },
      link: `/admin/customers/${c.id}`,
    });
  });

  // Sort merged activity feed by timestamp descending
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return items.slice(0, limit);
}
