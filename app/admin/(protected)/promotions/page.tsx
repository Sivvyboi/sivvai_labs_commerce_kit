/**
 * app/(admin)/promotions/page.tsx
 *
 * Admin Promotions & Coupons Page — Server Component.
 * Fetches all promotions with associated coupon codes.
 */

import * as React from "react";
import type { Metadata } from "next";

import { requirePermissionPage } from "@/lib/auth/admin-guard";
import { getAllPromotions } from "@/services/promotion-service";
import { PromotionManager } from "./PromotionManager";

export const metadata: Metadata = {
  title: "Promotions",
};

export default async function AdminPromotionsPage() {
  await requirePermissionPage("manage_promotions");
  const promotions = await getAllPromotions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--kit-text-primary)]">Promotions & Coupons</h1>
        <p className="mt-0.5 text-sm text-[var(--kit-text-secondary)]">
          Create and manage discount codes and promotional campaigns ({promotions.length} total)
        </p>
      </div>

      <PromotionManager promotions={promotions} />
    </div>
  );
}
