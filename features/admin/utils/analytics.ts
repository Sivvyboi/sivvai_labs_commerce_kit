import "server-only";

/**
 * features/admin/utils/analytics.ts
 *
 * Server-side dashboard analytics utilities.
 * All queries run via createAdminClient() to bypass RLS.
 * Queries are parallelised with Promise.all to minimise dashboard latency.
 */

import * as orderRepo from "@/lib/db/orders";
import * as inventoryRepo from "@/lib/db/inventory";
import { createAdminClient } from "@/lib/supabase/admin";

export interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  ordersToday: number;
  avgOrderValue: number;
  totalCustomers: number;
  newCustomers30d: number;
  activePromotions: number;
  lowInventoryCount: number;
  /** Last 8 weeks revenue — for the bar chart */
  weeklyRevenue: Array<{ week: string; revenue: number }>;
}

async function getCustomerStats(): Promise<{ total: number; new30d: number }> {
  const supabase = createAdminClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [{ count: total }, { count: new30d }] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString()),
  ]);

  return { total: total ?? 0, new30d: new30d ?? 0 };
}

async function getActivePromotionCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("promotions")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  return count ?? 0;
}

async function getWeeklyRevenue(): Promise<Array<{ week: string; revenue: number }>> {
  const supabase = createAdminClient();

  // Fetch orders from last 8 weeks
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const { data } = await supabase
    .from("orders")
    .select("grand_total, created_at")
    .gte("created_at", eightWeeksAgo.toISOString())
    .not("status", "in", "(cancelled,refunded)");

  if (!data) return [];

  // Group by ISO week (YYYY-Www)
  const weekMap = new Map<string, number>();

  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // align to Monday
    const label = `W${getISOWeek(monday)}`;
    weekMap.set(label, 0);
  }

  data.forEach((order) => {
    const d = new Date(order.created_at);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const label = `W${getISOWeek(monday)}`;
    if (weekMap.has(label)) {
      weekMap.set(label, (weekMap.get(label) ?? 0) + (order.grand_total ?? 0));
    }
  });

  return Array.from(weekMap.entries()).map(([week, revenue]) => ({ week, revenue }));
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Fetches all dashboard metrics in parallel.
 * Call from the dashboard page Server Component.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [
    { totalRevenue, totalOrders },
    ordersToday,
    customerStats,
    activePromotions,
    lowInventoryCount,
    weeklyRevenue,
  ] = await Promise.all([
    orderRepo.getRevenueStats(),
    orderRepo.getTodayOrderCount(),
    getCustomerStats(),
    getActivePromotionCount(),
    inventoryRepo.getLowStockCount(5),
    getWeeklyRevenue(),
  ]);

  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  return {
    totalRevenue,
    totalOrders,
    ordersToday,
    avgOrderValue,
    totalCustomers: customerStats.total,
    newCustomers30d: customerStats.new30d,
    activePromotions,
    lowInventoryCount,
    weeklyRevenue,
  };
}
