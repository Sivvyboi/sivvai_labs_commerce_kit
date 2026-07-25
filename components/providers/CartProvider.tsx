"use client";

/**
 * components/providers/CartProvider.tsx
 *
 * Client Component provider that initializes and hydrates the Zustand cart store
 * from the server cookie on initial application load.
 */

import * as React from "react";
import { useCartStore } from "@/features/storefront/store/cart.store";
import { getOrCreateCartAction } from "@/features/storefront/actions/cart.actions";

export interface CartProviderProps {
  children: React.ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const setCart = useCartStore((state) => state.setCart);
  const initialized = React.useRef(false);

  React.useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function hydrateCart() {
      try {
        const res = await getOrCreateCartAction();
        if (res.cart) {
          setCart(res.cart);
        }
      } catch (err) {
        console.error("Failed to hydrate storefront cart:", err);
      }
    }

    hydrateCart();
  }, [setCart]);

  return <>{children}</>;
}
