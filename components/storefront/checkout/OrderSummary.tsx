"use client";

/**
 * components/storefront/checkout/OrderSummary.tsx
 *
 * Client Component. Reactive order summary panel showing product breakdown,
 * subtotal, shipping cost, discount, and grand total.
 */

import { useCart } from "@/features/storefront/hooks/useCart";
import { Price } from "@/components/shared/Price";
import { ShoppingBag, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface OrderSummaryProps {
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  grandTotal: number;
  className?: string;
}

export function OrderSummary({
  subtotal,
  shippingTotal,
  discountTotal,
  grandTotal,
  className,
}: OrderSummaryProps) {
  const { cart } = useCart();
  const items = cart?.items ?? [];
  const [isExpandedMobile, setIsExpandedMobile] = useState(false);

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-5 space-y-4 shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--kit-border)] pb-3">
        <h2 className="text-base font-bold text-[var(--kit-text-primary)] flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-[var(--kit-accent)]" />
          <span>Order Summary</span>
        </h2>

        {/* Mobile toggle button */}
        <button
          type="button"
          onClick={() => setIsExpandedMobile(!isExpandedMobile)}
          aria-expanded={isExpandedMobile}
          className="sm:hidden text-xs text-[var(--kit-accent)] font-semibold flex items-center gap-1"
        >
          <span>{isExpandedMobile ? "Hide Items" : "View Items"}</span>
          {isExpandedMobile ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Cart Items List */}
      <div
        className={cn(
          "space-y-3 max-h-72 overflow-y-auto pr-1 divide-y divide-[var(--kit-border)]",
          !isExpandedMobile && "hidden sm:block"
        )}
      >
        {items.map((item) => {
            const product = item.variant?.product;

            return (
              <div key={item.id} className="pt-3 first:pt-0 flex items-center gap-3">
                <div className="relative h-12 w-12 rounded-xl bg-[var(--kit-surface)] border border-[var(--kit-border)] overflow-hidden shrink-0 flex items-center justify-center text-[var(--kit-muted-fg)] text-[10px]">
                  <ShoppingBag className="h-5 w-5 opacity-30" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--kit-accent)] text-[9px] font-bold text-[var(--kit-accent-fg)]">
                    {item.quantity}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--kit-text-primary)] truncate">
                    {product?.name ?? "Product"}
                  </p>
                </div>

                <div className="text-right text-xs font-bold text-[var(--kit-text-primary)]">
                  <Price amount={(item.unit_price_snapshot / 100) * item.quantity} size="sm" />
                </div>
              </div>
            );
          })}
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-2 pt-3 border-t border-[var(--kit-border)] text-xs sm:text-sm">
        <div className="flex justify-between text-[var(--kit-text-secondary)]">
          <span>Subtotal</span>
          <Price amount={subtotal} size="sm" />
        </div>

        <div className="flex justify-between text-[var(--kit-text-secondary)]">
          <span>Shipping Cost</span>
          {shippingTotal > 0 ? (
            <Price amount={shippingTotal} size="sm" />
          ) : (
            <span className="text-emerald-500 font-semibold">Calculated at next step</span>
          )}
        </div>

        {discountTotal > 0 && (
          <div className="flex justify-between text-emerald-500 font-semibold">
            <span>Discount Applied</span>
            <span>-<Price amount={discountTotal} size="sm" /></span>
          </div>
        )}

        <div className="flex justify-between pt-3 border-t border-[var(--kit-border)] text-base font-extrabold text-[var(--kit-text-primary)]">
          <span>Total Payable</span>
          <Price amount={grandTotal} size="md" />
        </div>
      </div>
    </div>
  );
}
