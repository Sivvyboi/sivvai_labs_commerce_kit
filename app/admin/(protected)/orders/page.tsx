/**
 * app/(admin)/orders/page.tsx
 *
 * Admin Orders List — Server Component.
 * Supports status tabs filter (?status=), search (?q=), period filter (?period=), and pagination.
 */

import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { clsx } from "clsx";

import { requirePermissionPage } from "@/lib/auth/admin-guard";
import { getAllOrders } from "@/services/order-service";
import { OrdersTable } from "@/components/admin/tables/OrdersTable";
import { AdminSearch } from "@/components/admin/ui/AdminSearch";
import { Pagination } from "@/components/admin/ui/Pagination";
import { EmptyAdminState } from "@/components/admin/ui/EmptyAdminState";
import { OrderStatusValues } from "@/lib/validation/admin";

export const metadata: Metadata = {
  title: "Orders",
};

interface AdminOrdersPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    period?: string;
    offset?: string;
  }>;
}

function getFromDateForPeriod(period?: string): string | undefined {
  if (!period || period === "all") return undefined;
  const d = new Date();
  if (period === "today") {
    d.setUTCHours(0, 0, 0, 0);
  } else if (period === "7d") {
    d.setDate(d.getDate() - 7);
  } else if (period === "30d") {
    d.setDate(d.getDate() - 30);
  }
  return d.toISOString();
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  await requirePermissionPage("view_orders");
  const params = await searchParams;
  const search = params.q;
  const status = params.status;
  const period = params.period;
  const offset = Number(params.offset ?? 0);
  const limit = 20;

  const fromDate = getFromDateForPeriod(period);

  const { data: orders, count } = await getAllOrders({
    status,
    search,
    fromDate,
    offset,
    limit,
  });

  const statusTabs = [
    { label: "All Orders", value: "all" },
    ...OrderStatusValues.map((st) => ({
      label: st.charAt(0).toUpperCase() + st.slice(1),
      value: st,
    })),
  ];

  const periods = [
    { label: "All Time", value: "all" },
    { label: "Today", value: "today" },
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 30 Days", value: "30d" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--kit-text-primary)]">Orders</h1>
        <p className="mt-0.5 text-sm text-[var(--kit-text-secondary)]">
          Manage and process customer orders ({count} total)
        </p>
      </div>

      {/* Filter Row 1: Search + Period filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminSearch placeholder="Search by order number…" className="sm:w-72" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--kit-text-muted)]">Time Period:</span>
          <div className="flex items-center gap-1 overflow-x-auto rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] p-1">
            {periods.map((p) => {
              const isActive = (params.period ?? "all") === p.value;
              const href = p.value === "all" ? "/admin/orders" : `/admin/orders?period=${p.value}`;

              return (
                <Link
                  key={p.value}
                  href={href}
                  className={clsx(
                    "rounded-[var(--kit-radius-sm)] px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-[var(--kit-card)] text-[var(--kit-text-primary)] shadow-[var(--kit-shadow-sm)]"
                      : "text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)]"
                  )}
                >
                  {p.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Row 2: Status tabs */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] p-1">
        {statusTabs.map((tab) => {
          const isActive = (params.status ?? "all") === tab.value;
          const href = tab.value === "all" ? "/admin/orders" : `/admin/orders?status=${tab.value}`;

          return (
            <Link
              key={tab.value}
              href={href}
              className={clsx(
                "rounded-[var(--kit-radius-sm)] px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "bg-[var(--kit-card)] text-[var(--kit-text-primary)] shadow-[var(--kit-shadow-sm)]"
                  : "text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)]"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Table or Empty State */}
      {orders.length === 0 ? (
        <EmptyAdminState
          title="No orders found"
          description={search ? `No orders matching "${search}"` : "Orders placed by customers will appear here."}
        />
      ) : (
        <>
          <OrdersTable orders={orders} />
          <Pagination
            total={count}
            limit={limit}
            offset={offset}
            basePath="/admin/orders"
            searchParams={{ q: search, status: params.status, period: params.period }}
          />
        </>
      )}
    </div>
  );
}
