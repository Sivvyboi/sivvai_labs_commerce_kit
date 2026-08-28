"use client";

/**
 * components/storefront/layout/CartDrawer.tsx
 *
 * Client Component. Live slide-in shopping cart drawer.
 *
 * Connected to `useCart` hook & Server Actions:
 *  - Displays live line items with thumbnail, title, options, and unit price
 *  - QuantitySelector for quantity changes
 *  - Remove button for item deletion
 *  - Coupon code entry field & discount summary
 *  - Empty state with "Continue Shopping" CTA
 *  - "Proceed to Checkout" CTA button
 */

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/features/storefront/hooks/useCart";
import { Price } from "@/components/shared/Price";
import { QuantitySelector } from "@/components/storefront/product/QuantitySelector";
import { EmptyState } from "@/components/shared/EmptyState";
import { ROUTES } from "@/constants/routes";
import { X, ShoppingBag, Trash2, ArrowRight, Tag, Check, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { useCurrency } from "@/components/shared/CurrencyProvider";

export function CartDrawer() {
  const currency = useCurrency();
  const {
    cart,
    cartCount,
    subtotal,
    discountAmount,
    grandTotal,
    appliedCoupon,
    isDrawerOpen,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    closeDrawer,
  } = useCart();

  const [couponInput, setCouponInput] = React.useState("");
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = React.useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = React.useState(false);

  // Handle ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  // Lock scroll
  React.useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setIsApplyingCoupon(true);
    setCouponError(null);
    setCouponSuccess(null);

    const res = await applyCoupon(couponInput.trim());
    setIsApplyingCoupon(false);

    if (res.success) {
      setCouponSuccess(`Promo code "${couponInput.toUpperCase()}" applied! Saved ${formatCurrency(res.discountAmount, currency)}`);
    } else {
      setCouponError(res.error ?? "Invalid promo code");
    }
  };

  if (!isDrawerOpen) return null;

  const items = cart?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Slide-in Panel from Right */}
      <div className="relative flex w-full max-w-md flex-col bg-[var(--kit-bg)] shadow-xl transition-transform animate-in slide-in-from-right duration-300 z-10 border-l border-[var(--kit-border)]">
        {/* Drawer Header */}
        <div className="flex h-16 items-center justify-between border-b border-[var(--kit-border)] px-4 sm:px-6">
          <div className="flex items-center gap-2 font-semibold text-[var(--kit-text-primary)]">
            <ShoppingBag className="h-5 w-5 text-[var(--kit-accent)]" />
            <span>Shopping Cart</span>
            {cartCount > 0 && (
              <span className="rounded-full bg-[var(--kit-accent)] px-2 py-0.5 text-xs text-[var(--kit-accent-fg)] font-bold">
                {cartCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {cartCount > 0 && (
              <button
                onClick={() => clearCart()}
                className="text-xs text-[var(--kit-muted-fg)] hover:text-[var(--kit-danger)] transition-colors mr-2"
                title="Clear all items"
              >
                Clear
              </button>
            )}
            <button
              onClick={closeDrawer}
              aria-label="Close cart"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--kit-text-secondary)] hover:bg-[var(--kit-surface)] hover:text-[var(--kit-text-primary)] transition-colors min-h-[44px] min-w-[44px]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Cart Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {items.length === 0 ? (
            <EmptyState
              title="Your cart is empty"
              description="Looks like you haven't added any items to your cart yet."
              action={{
                label: "Browse Catalog",
                href: ROUTES.catalog,
                onClick: closeDrawer,
              }}
            />
          ) : (
            <div className="space-y-4">
              {items.map((line) => {
                const product = line.variant?.product;
                const productName = product?.name ?? "Product Item";
                const variantSku = line.variant?.sku;
                const unitPrice =
                  line.unit_price_snapshot ??
                  line.variant?.price_override ??
                  product?.base_price ??
                  0;

                // Find primary image if available
                const imageUrl =
                  product?.images?.find((img) => img.is_primary)?.url ??
                  product?.images?.[0]?.url ??
                  null;

                return (
                  <div
                    key={line.id}
                    className="flex gap-3 p-3 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-xs transition-colors"
                  >
                    {/* Thumbnail Image */}
                    <div className="relative h-20 w-20 rounded-lg bg-[var(--kit-surface)] overflow-hidden shrink-0">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={productName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[var(--kit-muted-fg)]">
                          <ShoppingBag className="h-6 w-6 opacity-40" />
                        </div>
                      )}
                    </div>

                    {/* Details & Actions */}
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-semibold text-[var(--kit-text-primary)] truncate">
                            {productName}
                          </h4>
                          {variantSku && (
                            <p className="text-[10px] text-[var(--kit-muted-fg)]">
                              SKU: {variantSku}
                            </p>
                          )}
                        </div>

                        {/* Remove Item Button */}
                        <button
                          onClick={() => removeItem(line.id)}
                          aria-label={`Remove ${productName} from cart`}
                          className="text-[var(--kit-muted-fg)] hover:text-[var(--kit-danger)] transition-colors p-1 rounded-md min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Price & Quantity Controls */}
                      <div className="flex items-center justify-between pt-2">
                        <Price amount={Number(unitPrice) / 100} size="sm" />
                        <QuantitySelector
                          value={line.quantity}
                          min={1}
                          max={99}
                          onChange={(newQty) => updateQuantity(line.id, newQty)}
                          className="scale-90 origin-right"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer / Summary / Checkout CTA */}
        {items.length > 0 && (
          <div className="border-t border-[var(--kit-border)] p-4 sm:p-6 space-y-4 bg-[var(--kit-surface)]">
            {/* Coupon Entry Form */}
            <form onSubmit={handleApplyCoupon} className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-3 h-4 w-4 text-[var(--kit-muted-fg)]" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Promo code"
                    className="w-full rounded-lg border border-[var(--kit-border)] bg-[var(--kit-bg)] pl-9 pr-3 py-2 text-xs text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] uppercase"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isApplyingCoupon || !couponInput.trim()}
                  className="rounded-lg bg-[var(--kit-primary)] px-3 py-2 text-xs font-semibold text-[var(--kit-primary-fg)] hover:opacity-90 disabled:opacity-40 transition-opacity min-h-[38px]"
                >
                  {isApplyingCoupon ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </button>
              </div>

              {couponSuccess && (
                <p className="text-[11px] font-medium text-[var(--kit-success)] flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>{couponSuccess}</span>
                </p>
              )}
              {couponError && (
                <p className="text-[11px] font-medium text-[var(--kit-danger)]">
                  {couponError}
                </p>
              )}
            </form>

            {/* Price Calculations */}
            <div className="space-y-1.5 border-t border-[var(--kit-border)] pt-3 text-xs">
              <div className="flex items-center justify-between text-[var(--kit-text-secondary)]">
                <span>Subtotal</span>
                <Price amount={subtotal} size="sm" />
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-[var(--kit-success)] font-medium">
                  <span>Discount ({appliedCoupon})</span>
                  <span>-<Price amount={discountAmount} size="sm" /></span>
                </div>
              )}

              <div className="flex items-center justify-between font-bold text-sm text-[var(--kit-text-primary)] pt-1 border-t border-[var(--kit-border)]/50">
                <span>Estimated Total</span>
                <Price amount={grandTotal} size="md" className="text-[var(--kit-accent)]" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Link
                href={ROUTES.cart}
                onClick={closeDrawer}
                className="flex items-center justify-center rounded-lg border border-[var(--kit-border)] bg-[var(--kit-bg)] py-2.5 text-xs font-semibold text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors min-h-[44px]"
              >
                View Full Cart
              </Link>

              <Link
                href={ROUTES.checkout}
                onClick={closeDrawer}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--kit-accent)] py-2.5 text-xs font-semibold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[44px] shadow-sm"
              >
                <span>Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
