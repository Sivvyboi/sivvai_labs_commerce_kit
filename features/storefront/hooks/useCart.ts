"use client";

/**
 * features/storefront/hooks/useCart.ts
 *
 * Primary client hook for interacting with the shopping cart.
 * Bridges Server Actions to the Zustand cart store.
 *
 * Exposes:
 *  - Cart state: cart, cartCount, subtotal, discountAmount, grandTotal, appliedCoupon, isDrawerOpen, isLoading
 *  - Actions: addItem, removeItem, updateQuantity, clearCart, applyCoupon, openDrawer, closeDrawer
 */

import * as React from "react";
import { useCartStore } from "@/features/storefront/store/cart.store";
import {
  addToCartAction,
  updateQuantityAction,
  removeFromCartAction,
  clearCartAction,
  applyCouponAction,
} from "@/features/storefront/actions/cart.actions";

export function useCart() {
  const {
    cart,
    cartCount,
    subtotal,
    discountAmount,
    appliedCoupon,
    isDrawerOpen,
    isLoading,
    setCart,
    setCoupon,
    setLoading,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  } = useCartStore();

  const grandTotal = Math.max(0, subtotal - discountAmount);

  /**
   * Re-evaluates active coupon discount when cart subtotal changes from item mutations.
   */
  const syncDiscountForCart = React.useCallback(
    async (currentCoupon: string | null) => {
      if (!currentCoupon) return;
      try {
        const res = await applyCouponAction(currentCoupon);
        if (res.success) {
          setCoupon(currentCoupon, res.discountAmount);
        } else {
          setCoupon(null, 0);
        }
      } catch {
        setCoupon(null, 0);
      }
    },
    [setCoupon]
  );

  // Automatically validate active coupon on initial load / subtotal update
  React.useEffect(() => {
    if (appliedCoupon && subtotal > 0) {
      void syncDiscountForCart(appliedCoupon);
    }
  }, [appliedCoupon, subtotal, syncDiscountForCart]);

  /**
   * Adds an item to the cart, updates state, and opens the cart drawer automatically.
   */
  const addItem = React.useCallback(
    async (params: {
      variantId: string;
      quantity?: number;
    }) => {
      setLoading(true);
      try {
        const res = await addToCartAction({
          variantId: params.variantId,
          quantity: params.quantity ?? 1,
        });

        if (res.cart) {
          setCart(res.cart);
          if (appliedCoupon) {
            void syncDiscountForCart(appliedCoupon);
          }
        }
        openDrawer();
        return res;
      } finally {
        setLoading(false);
      }
    },
    [setCart, setLoading, openDrawer, appliedCoupon, syncDiscountForCart]
  );

  /**
   * Updates line item quantity.
   */
  const updateQuantity = React.useCallback(
    async (cartLineId: string, quantity: number) => {
      setLoading(true);
      try {
        const res = await updateQuantityAction({ cartLineId, quantity });
        if (res.cart) {
          setCart(res.cart);
          if (appliedCoupon) {
            void syncDiscountForCart(appliedCoupon);
          }
        }
        return res;
      } finally {
        setLoading(false);
      }
    },
    [setCart, setLoading, appliedCoupon, syncDiscountForCart]
  );

  /**
   * Removes a line item from the cart.
   */
  const removeItem = React.useCallback(
    async (cartLineId: string) => {
      setLoading(true);
      try {
        const res = await removeFromCartAction(cartLineId);
        if (res.cart) {
          setCart(res.cart);
          if (!res.cart.items || res.cart.items.length === 0) {
            setCoupon(null, 0);
          } else if (appliedCoupon) {
            void syncDiscountForCart(appliedCoupon);
          }
        }
        return res;
      } finally {
        setLoading(false);
      }
    },
    [setCart, setLoading, appliedCoupon, syncDiscountForCart, setCoupon]
  );

  /**
   * Clears all items in the cart.
   */
  const clearCart = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await clearCartAction();
      if (res.cart) {
        setCart(res.cart);
      }
      setCoupon(null, 0);
      return res;
    } finally {
      setLoading(false);
    }
  }, [setCart, setCoupon, setLoading]);

  /**
   * Applies a promo code to the current cart.
   */
  const applyCoupon = React.useCallback(
    async (code: string) => {
      setLoading(true);
      try {
        const res = await applyCouponAction(code);
        if (res.success) {
          setCoupon(code.toUpperCase(), res.discountAmount);
        }
        return res;
      } finally {
        setLoading(false);
      }
    },
    [setCoupon, setLoading]
  );

  return {
    cart,
    cartCount,
    subtotal,
    discountAmount,
    grandTotal,
    appliedCoupon,
    isDrawerOpen,
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    applyCoupon,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  };
}
