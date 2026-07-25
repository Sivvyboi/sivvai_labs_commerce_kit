"use client";

/**
 * components/storefront/layout/CartDrawer.tsx
 *
 * Client Component. Slide-in shopping cart drawer from the right.
 *
 * Batch 2 scope:
 *  - Uses Zustand `useCartStore` for `isDrawerOpen` and `closeDrawer`
 *  - Smooth slide-in right animation and accessible backdrop
 *  - Placeholder cart UI (full cart sync belongs in Batch 4)
 */

import * as React from "react";
import Link from "next/link";
import { useCartStore } from "@/features/storefront/store/cart.store";
import { X, ShoppingBag, ArrowRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";

export function CartDrawer() {
  const { isDrawerOpen, closeDrawer, cartCount } = useCartStore();

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

  if (!isDrawerOpen) return null;

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

          <button
            onClick={closeDrawer}
            aria-label="Close cart"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--kit-text-secondary)] hover:bg-[var(--kit-surface)] hover:text-[var(--kit-text-primary)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {cartCount === 0 ? (
            /* Empty Cart Placeholder */
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kit-surface)] text-[var(--kit-muted-fg)]">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[var(--kit-text-primary)]">
                  Your cart is empty
                </h3>
                <p className="text-xs text-[var(--kit-muted-fg)] max-w-xs">
                  Looks like you haven&apos;t added any items to your cart yet.
                </p>
              </div>
              <Link
                href={ROUTES.catalog}
                onClick={closeDrawer}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[var(--kit-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--kit-primary-fg)] hover:opacity-90 transition-opacity"
              >
                <span>Browse Products</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            /* Placeholder Items when cartCount > 0 */
            <div className="space-y-3">
              <p className="text-xs text-[var(--kit-muted-fg)]">
                Items in cart ({cartCount}) — Batch 4 will connect real cart data.
              </p>
              <div className="rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface)] p-3 flex gap-3 items-center">
                <div className="h-14 w-14 rounded-md bg-[var(--kit-border)] shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 w-3/4 bg-[var(--kit-border)] rounded animate-pulse mb-2" />
                  <div className="h-3 w-1/2 bg-[var(--kit-border)] rounded animate-pulse" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Checkout CTA */}
        {cartCount > 0 && (
          <div className="border-t border-[var(--kit-border)] p-4 sm:p-6 space-y-4 bg-[var(--kit-surface)]">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-[var(--kit-text-primary)]">Subtotal</span>
              <span className="text-[var(--kit-accent)]">₦0.00</span>
            </div>
            <p className="text-[11px] text-[var(--kit-muted-fg)]">
              Shipping and taxes calculated at checkout.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={ROUTES.cart}
                onClick={closeDrawer}
                className="flex items-center justify-center rounded-lg border border-[var(--kit-border)] bg-[var(--kit-bg)] py-2.5 text-xs font-semibold text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors min-h-[44px]"
              >
                View Cart
              </Link>
              <Link
                href={ROUTES.checkout}
                onClick={closeDrawer}
                className="flex items-center justify-center rounded-lg bg-[var(--kit-accent)] py-2.5 text-xs font-semibold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[44px]"
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
