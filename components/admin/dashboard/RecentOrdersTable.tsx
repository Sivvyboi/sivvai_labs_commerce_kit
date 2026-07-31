/**
 * components/admin/dashboard/RecentOrdersTable.tsx
 *
 * Condensed last-N-orders table for the dashboard overview.
 * Server Component — data passed as props.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import type { OrderWithLines } from "@/lib/db/orders";

interface RecentOrdersTableProps {
  orders: OrderWithLines[];
}

function formatAmount(amount: number | null): string {
  if (amount == null) return "—";
  // Amounts stored in minor units (kobo)
  return `₦${(amount / 100).toLocaleString("en-NG")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  return (
    <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-[var(--kit-shadow-sm)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--kit-border)] px-5 py-4">
        <p className="text-sm font-medium text-[var(--kit-text-primary)]">Recent Orders</p>
        <Link
          href="/admin/orders"
          className="flex items-center gap-1 text-xs text-[var(--kit-accent)] hover:underline"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-[var(--kit-text-muted)]">
          No orders yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--kit-border)] bg-[var(--kit-surface)]">
                <th className="px-5 py-2.5 text-left text-xs font-medium text-[var(--kit-text-muted)]">Order</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--kit-text-muted)]">Customer</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--kit-text-muted)]">Date</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--kit-text-muted)]">Status</th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-[var(--kit-text-muted)]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--kit-border)]">
              {orders.map((order) => {
                const customerName = order.customer
                  ? `${order.customer.first_name ?? ""} ${order.customer.last_name ?? ""}`.trim() ||
                    order.customer.email
                  : (order.guest_contact as { email?: string } | null)?.email ?? "Guest";

                return (
                  <tr key={order.id} className="hover:bg-[var(--kit-surface)] transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-[var(--kit-accent)] hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-[var(--kit-text-secondary)]">
                      <span className="max-w-[120px] truncate block">{customerName}</span>
                    </td>
                    <td className="px-3 py-3 text-[var(--kit-text-muted)]">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-[var(--kit-text-primary)]">
                      {formatAmount(order.grand_total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
