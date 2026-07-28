import Link from "next/link";
import type { OrderWithLines } from "@/lib/db/orders";
import { Price } from "@/components/shared/Price";
import { ChevronRight, PackageCheck, Clock, AlertCircle } from "lucide-react";

interface OrdersTableProps {
  orders: OrderWithLines[];
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            <PackageCheck className="h-3 w-3" /> Completed
          </span>
        );
      case "processing":
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
            <Clock className="h-3 w-3" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
            <AlertCircle className="h-3 w-3" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-sm">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-muted-fg)] uppercase tracking-wider font-semibold">
            <th className="py-3.5 px-4">Order Number</th>
            <th className="py-3.5 px-4">Date</th>
            <th className="py-3.5 px-4">Items</th>
            <th className="py-3.5 px-4">Total</th>
            <th className="py-3.5 px-4">Status</th>
            <th className="py-3.5 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--kit-border)] font-medium text-[var(--kit-text-primary)]">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-[var(--kit-surface)]/50 transition-colors">
              <td className="py-3.5 px-4 font-mono font-bold text-[var(--kit-accent)]">
                {order.order_number}
              </td>
              <td className="py-3.5 px-4 text-[var(--kit-muted-fg)]">
                {new Date(order.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td className="py-3.5 px-4">{order.lines.length} item(s)</td>
              <td className="py-3.5 px-4 font-bold">
                <Price amount={order.grand_total} currency={order.currency} />
              </td>
              <td className="py-3.5 px-4">{getStatusBadge(order.status)}</td>
              <td className="py-3.5 px-4 text-right">
                <Link
                  href={`/account/orders/${order.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-[var(--kit-accent)] hover:underline min-h-[36px] px-2 py-1 rounded"
                >
                  <span>Details</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
