import Link from "next/link";
import type { OrderWithLines } from "@/lib/db/orders";
import { Price } from "@/components/shared/Price";
import { ChevronRight, Calendar, Package } from "lucide-react";

interface OrderCardProps {
  order: OrderWithLines;
}

export function OrderCard({ order }: OrderCardProps) {
  return (
    <div className="p-4 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-[var(--kit-accent)]">
          {order.order_number}
        </span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--kit-surface)] border border-[var(--kit-border)] text-[var(--kit-text-primary)] capitalize">
          {order.status}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--kit-muted-fg)] pt-1 border-t border-[var(--kit-border)]">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>{new Date(order.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" />
          <span>{order.lines.length} item(s)</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[var(--kit-border)]">
        <div>
          <p className="text-[10px] text-[var(--kit-muted-fg)] uppercase">Total Amount</p>
          <Price amount={order.grand_total} currency={order.currency} className="font-bold text-sm text-[var(--kit-text-primary)]" />
        </div>

        <Link
          href={`/account/orders/${order.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold rounded-lg bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] px-3 py-2 min-h-[36px]"
        >
          <span>View</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
