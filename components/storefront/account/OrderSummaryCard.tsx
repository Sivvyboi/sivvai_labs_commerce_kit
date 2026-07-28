import type { OrderRow } from "@/lib/db/orders";
import { Price } from "@/components/shared/Price";
import { MapPin, CreditCard, Receipt } from "lucide-react";

interface OrderSummaryCardProps {
  order: OrderRow;
}

export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  const shippingAddress = order.shipping_address as {
    street_line_1?: string;
    street_line_2?: string;
    city?: string;
    state?: string;
    country?: string;
    fullName?: string;
  } | null;

  return (
    <div className="space-y-6 p-5 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)]">
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--kit-border)] text-sm font-bold text-[var(--kit-text-primary)] uppercase tracking-wider">
        <Receipt className="h-4 w-4 text-[var(--kit-accent)]" />
        <span>Order Summary & Delivery</span>
      </div>

      {/* Totals Breakdown */}
      <div className="space-y-2 text-xs border-b border-[var(--kit-border)] pb-4">
        <div className="flex items-center justify-between text-[var(--kit-muted-fg)]">
          <span>Subtotal</span>
          <Price amount={order.subtotal} currency={order.currency} />
        </div>

        <div className="flex items-center justify-between text-[var(--kit-muted-fg)]">
          <span>Shipping Fee</span>
          <Price amount={order.shipping_total} currency={order.currency} />
        </div>

        {order.discount_total > 0 && (
          <div className="flex items-center justify-between text-emerald-600 font-medium">
            <span>Discount Applied</span>
            <span>-<Price amount={order.discount_total} currency={order.currency} /></span>
          </div>
        )}

        {order.tax_total > 0 && (
          <div className="flex items-center justify-between text-[var(--kit-muted-fg)]">
            <span>Estimated Tax</span>
            <Price amount={order.tax_total} currency={order.currency} />
          </div>
        )}

        <div className="flex items-center justify-between pt-2 text-sm font-bold text-[var(--kit-text-primary)] border-t border-[var(--kit-border)]">
          <span>Grand Total</span>
          <Price amount={order.grand_total} currency={order.currency} className="text-base text-[var(--kit-accent)]" />
        </div>
      </div>

      {/* Delivery Address Snapshot */}
      {shippingAddress && (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[var(--kit-text-primary)]">
            <MapPin className="h-3.5 w-3.5 text-[var(--kit-accent)]" />
            <span>Shipping Address</span>
          </div>
          <div className="pl-5 text-[var(--kit-muted-fg)] leading-relaxed">
            {shippingAddress.fullName && <p className="font-semibold text-[var(--kit-text-primary)]">{shippingAddress.fullName}</p>}
            <p>{shippingAddress.street_line_1}</p>
            {shippingAddress.street_line_2 && <p>{shippingAddress.street_line_2}</p>}
            <p>{shippingAddress.city}, {shippingAddress.state}</p>
            <p className="font-medium">{shippingAddress.country}</p>
          </div>
        </div>
      )}

      {/* Payment Details */}
      <div className="space-y-1.5 text-xs pt-2 border-t border-[var(--kit-border)]">
        <div className="flex items-center gap-1.5 font-bold text-[var(--kit-text-primary)]">
          <CreditCard className="h-3.5 w-3.5 text-[var(--kit-accent)]" />
          <span>Payment Info</span>
        </div>
        <p className="pl-5 text-[var(--kit-muted-fg)] capitalize">
          Status: <span className="font-semibold text-[var(--kit-text-primary)]">{order.status}</span>
        </p>
      </div>
    </div>
  );
}
