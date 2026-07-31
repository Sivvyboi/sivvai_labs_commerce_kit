/**
 * app/(admin)/settings/page.tsx
 *
 * Admin Store Settings Page — Server Component.
 * Fetches store settings, brand profile, and feature flags in parallel.
 */

import * as React from "react";
import type { Metadata } from "next";

import { getStoreSettings, getBrandProfile, getFeatureFlags } from "@/services/store-service";
import { StoreSettingsManager } from "./StoreSettingsManager";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  const [settings, brand, flags] = await Promise.all([
    getStoreSettings(),
    getBrandProfile(),
    getFeatureFlags(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--kit-text-primary)]">Store Settings</h1>
        <p className="mt-0.5 text-sm text-[var(--kit-text-secondary)]">
          Manage your brand profile, operational settings, and feature flags
        </p>
      </div>

      <StoreSettingsManager settings={settings} brand={brand} flags={flags} />
    </div>
  );
}
