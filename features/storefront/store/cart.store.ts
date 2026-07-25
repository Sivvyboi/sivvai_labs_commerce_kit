/**
 * features/storefront/store/cart.store.ts
 *
 * Zustand store for managing shopping cart state and UI drawer state.
 */

import { create } from "zustand";
import type { EnrichedCart } from "@/services/cart-service";

export interface CartUIStore {
  cart: EnrichedCart | null;
  cartCount: number;
  subtotal: number;
  discountAmount: number;
  appliedCoupon: string | null;
  isDrawerOpen: boolean;
  isLoading: boolean;
  
  // Actions
  setCart: (cart: EnrichedCart | null) => void;
  setCoupon: (code: string | null, discountAmount: number) => void;
  setLoading: (loading: boolean) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

export const useCartStore = create<CartUIStore>((set) => ({
  cart: null,
  cartCount: 0,
  subtotal: 0,
  discountAmount: 0,
  appliedCoupon: null,
  isDrawerOpen: false,
  isLoading: false,

  setCart: (cart) =>
    set({
      cart,
      cartCount: cart?.itemCount ?? 0,
      subtotal: cart?.subtotal ?? 0,
    }),

  setCoupon: (code, discountAmount) =>
    set({
      appliedCoupon: code,
      discountAmount,
    }),

  setLoading: (isLoading) => set({ isLoading }),
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
}));
