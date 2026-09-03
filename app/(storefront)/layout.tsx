/**
 * app/(storefront)/layout.tsx
 *
 * Storefront Root Layout — Server Component.
 * Wraps all customer-facing storefront pages with the unified layout system and CurrencyProvider.
 */

import * as React from "react";
import { AnnouncementBanner } from "@/components/storefront/layout/AnnouncementBanner";
import { StorefrontHeader } from "@/components/storefront/layout/StorefrontHeader";
import { StorefrontFooter } from "@/components/storefront/layout/StorefrontFooter";
import { MobileBottomNav } from "@/components/storefront/layout/MobileBottomNav";
import { CartDrawer } from "@/components/storefront/layout/CartDrawer";
import { CartProvider } from "@/components/providers/CartProvider";
import { CurrencyProvider } from "@/components/shared/CurrencyProvider";
import { getStoreSettings } from "@/services/store-service";

import { localizationConfig } from "@/config/localization";
import { createClient } from "@/lib/supabase/server";
import { AdminPromotionToast } from "@/components/storefront/AdminPromotionToast";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, supabase] = await Promise.all([
    getStoreSettings().catch(() => null),
    createClient(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  const adminNotification = user?.user_metadata?.sivvai_admin_notification as
    | { role: string; promoted_at: string }
    | undefined;

  const currency = settings?.currency || localizationConfig.currency;

  return (
    <CurrencyProvider currency={currency}>
      <CartProvider>
        <div className="relative flex min-h-dvh flex-col bg-[var(--kit-bg)] text-[var(--kit-fg)] transition-colors">
          <AnnouncementBanner />
          <StorefrontHeader />
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <StorefrontFooter />
          <MobileBottomNav />
          <CartDrawer />
          {adminNotification?.role && (
            <AdminPromotionToast roleName={adminNotification.role} />
          )}
        </div>
      </CartProvider>
    </CurrencyProvider>
  );
}
