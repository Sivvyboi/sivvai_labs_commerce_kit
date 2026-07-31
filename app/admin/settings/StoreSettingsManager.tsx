"use client";

/**
 * app/(admin)/settings/StoreSettingsManager.tsx
 *
 * Tabbed Client Component for managing Store Settings, Brand Profile, and Feature Flags.
 */

import * as React from "react";
import { Save, Sliders, Store, Shield } from "lucide-react";
import { clsx } from "clsx";

import { useAdmin } from "@/features/admin/hooks/useAdmin";
import {
  updateStoreSettingsAction,
  updateBrandProfileAction,
  updateFeatureFlagAction,
} from "@/features/admin/actions/admin.actions";
import type { StoreSettingsRow, BrandProfileRow, FeatureFlagRow } from "@/lib/db/store";

interface StoreSettingsManagerProps {
  settings: StoreSettingsRow | null;
  brand: BrandProfileRow | null;
  flags: FeatureFlagRow[];
}

export function StoreSettingsManager({ settings, brand, flags }: StoreSettingsManagerProps) {
  const { execute, loading, error } = useAdmin();
  const [activeTab, setActiveTab] = React.useState<"brand" | "store" | "flags">("brand");

  // Brand Form State
  const [brandName, setBrandName] = React.useState(brand?.name ?? "");
  const [logoUrl, setLogoUrl] = React.useState(brand?.logo_url ?? "");
  const [contactEmail, setContactEmail] = React.useState(brand?.contact_email ?? "");
  const [contactPhone, setContactPhone] = React.useState(brand?.contact_phone ?? "");
  const [seoTitle, setSeoTitle] = React.useState(brand?.seo_title ?? "");

  // Store Settings Form State
  const [currency, setCurrency] = React.useState(settings?.currency ?? "NGN");
  const [taxMode, setTaxMode] = React.useState(settings?.tax_mode ?? "inclusive");
  const [paymentProvider, setPaymentProvider] = React.useState(settings?.active_payment_provider ?? "paystack");

  async function handleBrandSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brand?.id) return;
    await execute(() =>
      updateBrandProfileAction(brand.id, {
        name: brandName,
        logo_url: logoUrl || null,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
        seo_title: seoTitle || null,
      })
    );
  }

  async function handleStoreSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings?.id) return;
    await execute(() =>
      updateStoreSettingsAction(settings.id, {
        currency,
        tax_mode: taxMode as "inclusive" | "exclusive" | "none",
        active_payment_provider: paymentProvider,
      })
    );
  }

  async function handleFlagToggle(key: string, currentEnabled: boolean) {
    await execute(() =>
      updateFeatureFlagAction({
        key,
        enabled: !currentEnabled,
      })
    );
  }

  const tabs = [
    { id: "brand", label: "Brand Profile", icon: Store },
    { id: "store", label: "Store Configuration", icon: Sliders },
    { id: "flags", label: "Feature Flags", icon: Shield },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Tabs Row */}
      <div className="flex items-center gap-1 border-b border-[var(--kit-border)]">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={clsx(
                "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-[var(--kit-accent)] text-[var(--kit-accent)]"
                  : "border-transparent text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)]"
              )}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-[var(--kit-radius-md)] border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-4 text-xs text-[var(--kit-danger)]">
          {error}
        </div>
      )}

      {/* Tab 1: Brand Profile */}
      {activeTab === "brand" && (
        <form onSubmit={handleBrandSubmit} className="max-w-2xl space-y-6">
          <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
            <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Brand Identity</h2>

            <div>
              <label htmlFor="brand-name-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Store / Brand Name</label>
              <input
                id="brand-name-input"
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                required
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="brand-logourl-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Logo Image URL</label>
              <input
                id="brand-logourl-input"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="brand-email-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Contact Email</label>
                <input
                  id="brand-email-input"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                  className={clsx(
                    "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                    "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                    "focus:border-[var(--kit-accent)] focus:outline-none"
                  )}
                />
              </div>

              <div>
                <label htmlFor="brand-phone-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">WhatsApp / Contact Phone</label>
                <input
                  id="brand-phone-input"
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+234..."
                  className={clsx(
                    "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                    "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                    "focus:border-[var(--kit-accent)] focus:outline-none"
                  )}
                />
              </div>
            </div>

            <div>
              <label htmlFor="brand-seotitle-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Default SEO Title</label>
              <input
                id="brand-seotitle-input"
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Sivvai Store — Premium Commerce"
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-4 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save size={14} /> {loading ? "Saving…" : "Save Brand Profile"}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Store Configuration */}
      {activeTab === "store" && (
        <form onSubmit={handleStoreSubmit} className="max-w-2xl space-y-6">
          <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
            <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Store Operational Settings</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="store-currency-select" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Currency</label>
                <select
                  id="store-currency-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={clsx(
                    "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                    "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                    "focus:border-[var(--kit-accent)] focus:outline-none"
                  )}
                >
                  <option value="NGN">NGN (Nigerian Naira - ₦)</option>
                  <option value="USD">USD (US Dollar - $)</option>
                  <option value="EUR">EUR (Euro - €)</option>
                  <option value="GBP">GBP (British Pound - £)</option>
                </select>
              </div>

              <div>
                <label htmlFor="store-taxmode-select" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Tax Mode</label>
                <select
                  id="store-taxmode-select"
                  value={taxMode}
                  onChange={(e) => setTaxMode(e.target.value)}
                  className={clsx(
                    "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                    "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                    "focus:border-[var(--kit-accent)] focus:outline-none"
                  )}
                >
                  <option value="inclusive">Tax Included in Prices</option>
                  <option value="exclusive">Tax Added at Checkout</option>
                  <option value="none">No Tax Applied</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="store-paymentprovider-select" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Active Payment Provider</label>
                <select
                  id="store-paymentprovider-select"
                  value={paymentProvider}
                  onChange={(e) => setPaymentProvider(e.target.value)}
                  className={clsx(
                    "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                    "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                    "focus:border-[var(--kit-accent)] focus:outline-none"
                  )}
                >
                  <option value="paystack">Paystack</option>
                  <option value="flutterwave">Flutterwave</option>
                  <option value="stripe">Stripe</option>
                  <option value="manual_transfer">Manual Bank Transfer</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-4 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save size={14} /> {loading ? "Saving…" : "Save Store Settings"}
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Feature Flags */}
      {activeTab === "flags" && (
        <div className="max-w-3xl space-y-4">
          <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Progressive Feature Toggles</h2>
              <p className="text-xs text-[var(--kit-text-muted)]">Toggle system features live without code redeploys.</p>
            </div>

            {flags.length === 0 ? (
              <p className="text-xs text-[var(--kit-text-muted)]">No feature flags registered in database table.</p>
            ) : (
              <div className="divide-y divide-[var(--kit-border)] border border-[var(--kit-border)] rounded-[var(--kit-radius-md)] overflow-hidden">
                {flags.map((flag) => (
                  <div key={flag.id} className="flex items-center justify-between p-4 bg-[var(--kit-surface)]">
                    <div>
                      <p className="font-mono text-xs font-semibold text-[var(--kit-text-primary)]">{flag.key}</p>
                      <p className="text-[10px] text-[var(--kit-text-muted)]">ID: {flag.id}</p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flag.enabled}
                        onChange={() => handleFlagToggle(flag.key, flag.enabled)}
                        disabled={loading}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[var(--kit-muted)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--kit-accent)]"></div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
