/**
 * components/admin/tables/OrdersTable.tsx
 *
 * Full orders table component for the admin orders list page.
 * Server Component — renders links and badges.
 */

import * as React from "react";
import Link from "next/link";
import { Eye } from "lucide-react";

import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import type { OrderWithLines } from "@/lib/db/orders";

interface OrdersTableProps {
  orders: OrderWithLines[];
}

function formatAmount(kobo: number | null): string {
  if (kobo == null) return "—";
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrdersTable({ orders }: OrdersTableProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-[var(--kit-shadow-sm)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--kit-border)] bg-[var(--kit-surface)]">
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Order #</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Customer</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Date</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Items</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Status</th>
            <th className="px-3 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">Total</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--kit-border)]">
          {orders.map((order) => {
            const customerName = order.customer
              ? `${order.customer.first_name ?? ""} ${order.customer.last_name ?? ""}`.trim() ||
                order.customer.email
              : (order.guest_contact as { email?: string } | null)?.email ?? "Guest";

            const itemCount = order.lines.reduce((sum, l) => sum + l.quantity, 0);

            return (
              <tr key={order.id} className="hover:bg-[var(--kit-surface)] transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-medium font-mono text-[var(--kit-accent)] hover:underline"
                  >
                    {order.order_number}
                  </Link>
                </td>
                <td className="px-3 py-3 text-[var(--kit-text-secondary)]">
                  <span className="truncate max-w-[150px] block">{customerName}</span>
                </td>
                <td className="px-3 py-3 text-xs text-[var(--kit-text-muted)]">
                  {formatDate(order.created_at)}
                </td>
                <td className="px-3 py-3 text-[var(--kit-text-muted)]">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-3 py-3 text-right font-medium text-[var(--kit-text-primary)]">
                  {formatAmount(order.grand_total)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors ml-auto"
                    title="View order details"
                  >
                    <Eye size={14} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
