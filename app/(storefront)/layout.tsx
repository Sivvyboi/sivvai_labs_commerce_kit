/**
 * app/(storefront)/layout.tsx
 *
 * Storefront Root Layout — Server Component.
 * Wraps all customer-facing storefront pages with the unified layout system.
 *
 * Structure:
 *  - CartProvider (client wrapper, thin)
 *    - AnnouncementBanner (Server Component)
 *    - StorefrontHeader (Client Component)
 *    - <main> (children, padded for mobile bottom nav)
 *    - StorefrontFooter (Server Component)
 *    - MobileBottomNav (Client Component)
 *    - CartDrawer (Client Component)
 */

import * as React from "react";
import { AnnouncementBanner } from "@/components/storefront/layout/AnnouncementBanner";
import { StorefrontHeader } from "@/components/storefront/layout/StorefrontHeader";
import { StorefrontFooter } from "@/components/storefront/layout/StorefrontFooter";
import { MobileBottomNav } from "@/components/storefront/layout/MobileBottomNav";
import { CartDrawer } from "@/components/storefront/layout/CartDrawer";
import { CartProvider } from "@/components/providers/CartProvider";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="relative flex min-h-dvh flex-col bg-[var(--kit-bg)] text-[var(--kit-fg)] transition-colors">
        <AnnouncementBanner />
        <StorefrontHeader />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <StorefrontFooter />
        <MobileBottomNav />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
