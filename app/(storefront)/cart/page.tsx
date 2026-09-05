/**
 * app/(storefront)/cart/page.tsx
 *
 * Full Cart Page — Server Component wrapper.
 * Renders the dedicated cart page experience.
 */

import type { Metadata } from "next";
import { getCartToken } from "@/lib/auth/cart-token";
import * as cartService from "@/services/cart-service";
import { siteConfig } from "@/config/site";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { EmptyState } from "@/components/shared/EmptyState";
import { CartPageClient } from "@/app/(storefront)/cart/CartPageClient";
import { ROUTES } from "@/constants/routes";
import { ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shopping Cart",
  description: `View and manage items in your shopping cart at ${siteConfig.name}.`,
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const cartToken = await getCartToken();
  const cart = cartToken ? await cartService.getCartByToken(cartToken) : null;
  const hasItems = Boolean(cart && cart.items && cart.items.length > 0);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <Breadcrumb
        items={[
          { label: "Home", href: ROUTES.home },
          { label: "Catalog", href: ROUTES.catalog },
          { label: "Shopping Cart" },
        ]}
      />

      <div className="border-b border-[var(--kit-border)] pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--kit-text-primary)]">
          Your Shopping Cart
        </h1>
        <p className="text-xs sm:text-sm text-[var(--kit-muted-fg)] mt-1">
          Review your items, apply promo codes, and proceed to checkout.
        </p>
      </div>

      {!hasItems ? (
        <div className="py-16 text-center">
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8" />}
            title="Your Cart is Empty"
            description="Explore our catalog to find amazing products."
            action={{
              label: "Browse Catalog",
              href: ROUTES.catalog,
            }}
          />
        </div>
      ) : (
        <CartPageClient />
      )}
    </div>
  );
}
