/**
 * app/(storefront)/checkout/page.tsx
 *
 * Storefront Checkout Page — Server Component wrapper.
 *
 * Checks active cart in server cookies.
 *  - If cart is empty: renders EmptyState with "Continue Shopping" CTA.
 *  - If cart has items: renders the interactive 4-step Checkout UI.
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { getCartToken } from "@/lib/auth/cart-token";
import * as cartService from "@/services/cart-service";
import { getCurrentUser, getOrCreateCustomer } from "@/lib/auth/server-auth";
import { siteConfig } from "@/config/site";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { EmptyState } from "@/components/shared/EmptyState";
import { CheckoutClient } from "./CheckoutClient";
import { ROUTES } from "@/constants/routes";
import { ShoppingBag } from "lucide-react";
import type { CustomerWithAddresses } from "@/lib/db/customers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Checkout — ${siteConfig.name}`,
  description: `Complete your purchase at ${siteConfig.name}. Secure 256-bit SSL encrypted checkout.`,
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const cartToken = await getCartToken();
  const cart = cartToken ? await cartService.getCartByToken(cartToken) : null;
  const hasItems = Boolean(cart && cart.items && cart.items.length > 0);

  let customer: CustomerWithAddresses | null = null;
  try {
    const user = await getCurrentUser();
    if (user) {
      customer = await getOrCreateCustomer(user);
    }
  } catch {
    customer = null;
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: "Home", href: ROUTES.home },
          { label: "Catalog", href: ROUTES.catalog },
          { label: "Checkout" },
        ]}
      />

      {/* Page Heading */}
      <div className="border-b border-[var(--kit-border)] pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--kit-text-primary)]">
          Checkout
        </h1>
        <p className="text-xs sm:text-sm text-[var(--kit-muted-fg)] mt-1">
          Complete your order details and payment securely.
        </p>
      </div>

      {/* Main Content Area */}
      {!hasItems ? (
        <div className="py-16 text-center">
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8" />}
            title="Your Cart is Empty"
            description="You don't have any items in your cart to checkout. Explore our catalog to find products."
            action={{
              label: "Continue Shopping",
              href: ROUTES.catalog,
            }}
          />
        </div>
      ) : (
        <Suspense fallback={<CheckoutLoadingPlaceholder />}>
          <CheckoutClient customer={customer} />
        </Suspense>
      )}
    </div>
  );
}

function CheckoutLoadingPlaceholder() {
  return (
    <div className="py-12 text-center text-xs text-[var(--kit-muted-fg)] animate-pulse">
      Loading checkout session...
    </div>
  );
}
