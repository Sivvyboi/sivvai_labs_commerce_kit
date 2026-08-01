/**
 * app/(admin)/page.tsx
 *
 * Admin Dashboard Overview — Server Component.
 *
 * Fetches all metrics in parallel via getDashboardMetrics() and renders:
 *  - KPI metric cards (8 cards in a responsive grid)
 *  - Revenue bar chart
 *  - Recent orders table (last 5)
 *  - Low stock alert card
 *  - Quick actions panel
 */

import * as React from "react";
import type { Metadata } from "next";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Users,
  UserPlus,
  Tag,
  AlertTriangle,
  Calendar,
} from "lucide-react";

import { getDashboardMetrics } from "@/features/admin/utils/analytics";
import { DashboardCard } from "@/components/admin/ui/DashboardCard";
import { RevenueChart } from "@/components/admin/dashboard/RevenueChart";
import { LowStockCard } from "@/components/admin/dashboard/LowStockCard";
import { QuickActions } from "@/components/admin/dashboard/QuickActions";
import { RecentOrdersTable } from "@/components/admin/dashboard/RecentOrdersTable";
import { getLowStockItems } from "@/services/inventory-service";
import { getAllOrders } from "@/services/order-service";

export const metadata: Metadata = {
  title: "Dashboard",
};

function formatCurrency(minorUnits: number): string {
  return `₦${(minorUnits / 100).toLocaleString("en-NG")}`;
}

export default async function AdminDashboardPage() {
  // Parallel data fetch — metrics + last 5 orders + low stock items
  const [metrics, { data: recentOrders }, lowStockItems] = await Promise.all([
    getDashboardMetrics(),
    getAllOrders({ limit: 5 }),
    getLowStockItems(5),
  ]);

  const avgOrderDisplay =
    metrics.totalOrders > 0 ? formatCurrency(metrics.avgOrderValue) : "—";

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--kit-text-primary)]">Dashboard</h1>
        <p className="mt-0.5 text-sm text-[var(--kit-text-secondary)]">
          Your store at a glance
        </p>
      </div>

      {/* ── Metric Cards ─────────────────────────────────────────── */}
      <section aria-label="Key performance indicators">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Total Revenue"
            value={formatCurrency(metrics.totalRevenue)}
            icon={DollarSign}
            accent="default"
          />
          <DashboardCard
            title="Total Orders"
            value={metrics.totalOrders.toLocaleString()}
            icon={ShoppingBag}
            accent="info"
          />
          <DashboardCard
            title="Orders Today"
            value={metrics.ordersToday.toLocaleString()}
            icon={Calendar}
            accent="success"
          />
          <DashboardCard
            title="Avg. Order Value"
            value={avgOrderDisplay}
            icon={TrendingUp}
            accent="default"
          />
          <DashboardCard
            title="Total Customers"
            value={metrics.totalCustomers.toLocaleString()}
            icon={Users}
            accent="info"
          />
          <DashboardCard
            title="New Customers (30d)"
            value={metrics.newCustomers30d.toLocaleString()}
            icon={UserPlus}
            accent="success"
          />
          <DashboardCard
            title="Active Promotions"
            value={metrics.activePromotions.toLocaleString()}
            icon={Tag}
            accent="warning"
          />
          <DashboardCard
            title="Low Stock Items"
            value={metrics.lowInventoryCount.toLocaleString()}
            icon={AlertTriangle}
            accent={metrics.lowInventoryCount > 0 ? "danger" : "success"}
            description={metrics.lowInventoryCount > 0 ? "Needs attention" : "All items stocked"}
          />
        </div>
      </section>

      {/* ── Revenue Chart ─────────────────────────────────────────── */}
      <section aria-label="Revenue chart">
        <RevenueChart data={metrics.weeklyRevenue} />
      </section>

      {/* ── Bottom row: Recent Orders + Low Stock + Quick Actions ──── */}
      <section
        aria-label="Recent activity"
        className="grid grid-cols-1 gap-6 xl:grid-cols-3"
      >
        {/* Recent orders — spans 2 columns on xl */}
        <div className="xl:col-span-2">
          <RecentOrdersTable orders={recentOrders} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <LowStockCard items={lowStockItems} limit={4} />
          <QuickActions />
        </div>
      </section>
    </div>
  );
}
