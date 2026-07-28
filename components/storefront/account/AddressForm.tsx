"use client";

import { useState } from "react";
import type { CustomerAddressRow } from "@/lib/db/customers";
import type { CustomerAddressInput } from "@/lib/validation/customer";
import { Loader2, MapPin } from "lucide-react";

interface AddressFormProps {
  initialAddress?: CustomerAddressRow | null;
  onSubmit: (input: CustomerAddressInput, addressId?: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AddressForm({
  initialAddress,
  onSubmit,
  onCancel,
  isLoading,
}: AddressFormProps) {
  const [label, setLabel] = useState(initialAddress?.label || "Home");
  const [streetLine1, setStreetLine1] = useState(initialAddress?.street_line_1 || "");
  const [streetLine2, setStreetLine2] = useState(initialAddress?.street_line_2 || "");
  const [city, setCity] = useState(initialAddress?.city || "");
  const [state, setState] = useState(initialAddress?.state || "");
  const [country, setCountry] = useState(initialAddress?.country || "NG");
  const [isDefault, setIsDefault] = useState(initialAddress?.is_default || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(
      {
        label,
        streetLine1,
        streetLine2,
        city,
        state,
        country,
        isDefault,
      },
      initialAddress?.id
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] space-y-4 shadow-md"
    >
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--kit-border)]">
        <MapPin className="h-5 w-5 text-[var(--kit-accent)]" />
        <h3 className="font-bold text-base text-[var(--kit-text-primary)]">
          {initialAddress ? "Edit Address" : "Add New Address"}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--kit-muted-fg)]">
            Address Label (e.g. Home, Office, Warehouse)
          </label>
          <input
            type="text"
            required
            placeholder="Home"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] min-h-[44px]"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--kit-muted-fg)]">
            Street Address Line 1
          </label>
          <input
            type="text"
            required
            placeholder="123 Commercial Avenue"
            value={streetLine1}
            onChange={(e) => setStreetLine1(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] min-h-[44px]"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--kit-muted-fg)]">
            Street Address Line 2 (Optional)
          </label>
          <input
            type="text"
            placeholder="Suite 404 / Floor 2"
            value={streetLine2}
            onChange={(e) => setStreetLine2(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] min-h-[44px]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--kit-muted-fg)]">
            City
          </label>
          <input
            type="text"
            required
            placeholder="Ikeja"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] min-h-[44px]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--kit-muted-fg)]">
            State / Region
          </label>
          <input
            type="text"
            required
            placeholder="Lagos"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] min-h-[44px]"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--kit-muted-fg)]">
            Country Code
          </label>
          <input
            type="text"
            required
            placeholder="NG"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] min-h-[44px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input
          id="isDefault"
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--kit-border)] text-[var(--kit-accent)] focus:ring-[var(--kit-accent)]"
        />
        <label htmlFor="isDefault" className="text-xs font-medium text-[var(--kit-text-primary)]">
          Set as default shipping address
        </label>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--kit-border)]">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-xs font-semibold rounded-lg border border-[var(--kit-border)] text-[var(--kit-muted-fg)] hover:text-[var(--kit-text-primary)] transition-colors min-h-[44px]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[44px] shadow-sm disabled:opacity-50"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{initialAddress ? "Save Changes" : "Add Address"}</span>
        </button>
      </div>
    </form>
  );
}
