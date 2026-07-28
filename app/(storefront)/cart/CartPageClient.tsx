"use client";

/**
 * app/(storefront)/cart/CartPageClient.tsx
 *
 * Full Cart Page Client Component.
 * Features line item management, quantity updates, promo code application,
 * item removal, clear cart, cost breakdown, and Checkout CTA.
 */

import Link from "next/link";
import { useCart } from "@/features/storefront/hooks/useCart";
import { Price } from "@/components/shared/Price";
import { QuantitySelector } from "@/components/storefront/product/QuantitySelector";
import { CouponInput } from "@/components/storefront/checkout/CouponInput";
import { ROUTES } from "@/constants/routes";
import { ShoppingBag, Trash2, ArrowRight, ArrowLeft } from "lucide-react";

export function CartPageClient() {
  const {
    cart,
    subtotal,
    discountAmount,
    grandTotal,
    appliedCoupon,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
  } = useCart();

  const items = cart?.items ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
      {/* Left Column: Cart Items List (7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--kit-border)] pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--kit-muted-fg)]">
            Items ({items.length})
          </span>
          <button
            type="button"
            onClick={() => clearCart()}
            className="text-xs font-medium text-[var(--kit-muted-fg)] hover:text-red-500 transition-colors"
          >
            Clear Cart
          </button>
        </div>

        <div className="divide-y divide-[var(--kit-border)] rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] px-4 overflow-hidden">
          {items.map((line) => {
            const product = line.variant?.product;
            const productName = product?.name ?? "Product Item";
            const unitPrice =
              line.unit_price_snapshot ??
              line.variant?.price_override ??
              product?.base_price ??
              0;

            return (
              <div key={line.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--kit-surface)] border border-[var(--kit-border)] text-[var(--kit-muted-fg)] shrink-0">
                    <ShoppingBag className="h-6 w-6 opacity-40" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--kit-text-primary)] truncate">
                      {productName}
                    </h3>
                    <p className="text-xs text-[var(--kit-muted-fg)]">
                      Unit: <Price amount={Number(unitPrice)} size="sm" />
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <QuantitySelector
                    value={line.quantity}
                    min={1}
                    max={99}
                    onChange={(newQty) => updateQuantity(line.id, newQty)}
                    className="scale-90"
                  />

                  <div className="text-right min-w-[70px]">
                    <Price amount={Number(unitPrice) * line.quantity} size="sm" />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(line.id)}
                    aria-label={`Remove ${productName}`}
                    className="p-1.5 text-[var(--kit-muted-fg)] hover:text-red-500 transition-colors rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2">
          <Link
            href={ROUTES.catalog}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--kit-accent)] hover:underline min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>

      {/* Right Column: Order Summary & Checkout CTA (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 space-y-6 shadow-xs">
          <h2 className="text-base font-bold text-[var(--kit-text-primary)] border-b border-[var(--kit-border)] pb-3">
            Order Summary
          </h2>

          {/* Coupon Input */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--kit-muted-fg)]">
              Promo Code
            </h3>
            <CouponInput
              appliedCoupon={appliedCoupon}
              discountAmount={discountAmount}
              onApply={async (code) => {
                await applyCoupon(code);
              }}
              onRemove={() => clearCart()}
            />
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-2 pt-4 border-t border-[var(--kit-border)] text-xs sm:text-sm">
            <div className="flex justify-between text-[var(--kit-text-secondary)]">
              <span>Subtotal</span>
              <Price amount={subtotal} size="sm" />
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-500 font-semibold">
                <span>Discount ({appliedCoupon})</span>
                <span>-<Price amount={discountAmount} size="sm" /></span>
              </div>
            )}

            <div className="flex justify-between text-[var(--kit-text-secondary)]">
              <span>Shipping</span>
              <span className="text-[var(--kit-muted-fg)] font-medium">Calculated at checkout</span>
            </div>

            <div className="flex justify-between pt-3 border-t border-[var(--kit-border)] text-base font-extrabold text-[var(--kit-text-primary)]">
              <span>Estimated Total</span>
              <Price amount={grandTotal} size="md" />
            </div>
          </div>

          {/* Checkout Button */}
          <Link
            href={ROUTES.checkout}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--kit-accent)] px-6 py-4 text-sm font-bold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity shadow-md min-h-[50px]"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
