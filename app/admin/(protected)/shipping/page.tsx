/**
 * app/admin/(protected)/shipping/page.tsx
 *
 * Shipping & Fulfilment Management Page — Server Component.
 * Enforces permission guard, fetches shipping zones and fulfilment methods in parallel.
 */

import * as React from "react";
import type { Metadata } from "next";

import { requirePermissionPage } from "@/lib/auth/admin-guard";
import {
  getAllShippingZonesAdmin,
  getAllFulfilmentMethodsAdmin,
} from "@/services/shipping-service";
import { ShippingManager } from "./ShippingManager";

export const metadata: Metadata = {
  title: "Shipping & Fulfilment",
};

export default async function AdminShippingPage() {
  await requirePermissionPage("manage_settings");

  const [zones, methods] = await Promise.all([
    getAllShippingZonesAdmin(),
    getAllFulfilmentMethodsAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--kit-text-primary)]">
          Shipping & Fulfilment
        </h1>
        <p className="mt-0.5 text-sm text-[var(--kit-text-secondary)]">
          Manage geographic delivery zones, shipping rates, and customer fulfilment methods
        </p>
      </div>

      <ShippingManager initialZones={zones} initialMethods={methods} />
    </div>
  );
}
