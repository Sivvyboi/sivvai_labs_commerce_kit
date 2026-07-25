/**
 * features/storefront/store/cart.store.ts
 *
 * Zustand store for managing shopping cart UI state (drawer visibility, count badge).
 *
 * Responsibilities in Batch 2:
 *  - Controls CartDrawer open/closed visibility state
 *  - Holds client-side item count badge state
 *
 * Full data synchronization with Supabase/cart-service is added in Batch 4.
 */

import { create } from "zustand";

export interface CartUIStore {
  cartCount: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setCartCount: (count: number) => void;
}

export const useCartStore = create<CartUIStore>((set) => ({
  cartCount: 0,
  isDrawerOpen: false,
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
  setCartCount: (count: number) => set({ cartCount: count }),
}));
