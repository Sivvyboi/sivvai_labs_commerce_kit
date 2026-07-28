"use client";

/**
 * components/storefront/checkout/ShippingAddressForm.tsx
 *
 * Client Component. Shipping address entry form (Address Line 1 & 2, City, State, Country).
 */

import type { ShippingAddressInfo } from "@/features/storefront/hooks/useCheckout";
import { MapPin, Building, Globe } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ShippingAddressFormProps {
  address: ShippingAddressInfo;
  onChange: (addr: Partial<ShippingAddressInfo>) => void;
  errors?: Record<string, string>;
  className?: string;
}

export function ShippingAddressForm({
  address,
  onChange,
  errors = {},
  className,
}: ShippingAddressFormProps) {
  return (
    <div className={cn("space-y-4 pt-4 border-t border-[var(--kit-border)]", className)}>
      <h2 className="text-base font-bold text-[var(--kit-text-primary)]">
        Shipping Address
      </h2>

      {/* Street Address */}
      <div className="space-y-1.5">
        <label
          htmlFor="addressLine1"
          className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider"
        >
          Street Address <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
          <input
            id="addressLine1"
            type="text"
            value={address.addressLine1}
            onChange={(e) => onChange({ addressLine1: e.target.value })}
            placeholder="123 Commerce Avenue"
            required
            className={cn(
              "w-full rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] pl-10 pr-4 py-3 text-sm text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] focus:border-transparent min-h-[44px]",
              errors.addressLine1 && "border-red-500 focus:ring-red-500"
            )}
          />
        </div>
        {errors.addressLine1 && (
          <p className="text-xs text-red-500 font-medium">{errors.addressLine1}</p>
        )}
      </div>

      {/* Address Line 2 */}
      <div className="space-y-1.5">
        <label
          htmlFor="addressLine2"
          className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider"
        >
          Apartment, Suite, Unit <span className="text-[var(--kit-muted-fg)] font-normal">(Optional)</span>
        </label>
        <input
          id="addressLine2"
          type="text"
          value={address.addressLine2}
          onChange={(e) => onChange({ addressLine2: e.target.value })}
          placeholder="Suite 4B"
          className="w-full rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] px-4 py-3 text-sm text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] focus:border-transparent min-h-[44px]"
        />
      </div>

      {/* City & State (2 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* City */}
        <div className="space-y-1.5">
          <label
            htmlFor="city"
            className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider"
          >
            City <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
            <input
              id="city"
              type="text"
              value={address.city}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="Ikeja"
              required
              className={cn(
                "w-full rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] pl-10 pr-4 py-3 text-sm text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] focus:border-transparent min-h-[44px]",
                errors.city && "border-red-500 focus:ring-red-500"
              )}
            />
          </div>
          {errors.city && (
            <p className="text-xs text-red-500 font-medium">{errors.city}</p>
          )}
        </div>

        {/* State */}
        <div className="space-y-1.5">
          <label
            htmlFor="state"
            className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider"
          >
            State / Region <span className="text-red-500">*</span>
          </label>
          <input
            id="state"
            type="text"
            value={address.state}
            onChange={(e) => onChange({ state: e.target.value })}
            placeholder="Lagos"
            required
            className={cn(
              "w-full rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] px-4 py-3 text-sm text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] focus:border-transparent min-h-[44px]",
              errors.state && "border-red-500 focus:ring-red-500"
            )}
          />
          {errors.state && (
            <p className="text-xs text-red-500 font-medium">{errors.state}</p>
          )}
        </div>
      </div>

      {/* Country */}
      <div className="space-y-1.5">
        <label
          htmlFor="country"
          className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider"
        >
          Country
        </label>
        <div className="relative">
          <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
          <select
            id="country"
            value={address.country}
            onChange={(e) => onChange({ country: e.target.value })}
            className="w-full rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] pl-10 pr-4 py-3 text-sm text-[var(--kit-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] focus:border-transparent min-h-[44px]"
          >
            <option value="NG">Nigeria (NG)</option>
            <option value="GH">Ghana (GH)</option>
            <option value="KE">Kenya (KE)</option>
            <option value="ZA">South Africa (ZA)</option>
            <option value="US">United States (US)</option>
            <option value="GB">United Kingdom (GB)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
