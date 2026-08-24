"use client";
/**
 * components/storefront/checkout/SavedAddressSelector.tsx
 *
 * Client Component for selecting from authenticated customer saved addresses
 * or switching to "Use a new address" mode during checkout.
 */

import * as React from "react";
import type { CustomerAddressRow } from "@/lib/db/customers";
import { MapPin, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SavedAddressSelectorProps {
  addresses: CustomerAddressRow[];
  selectedAddressId: string | null;
  mode: "saved" | "new";
  onSelectAddress: (addressId: string) => void;
  onSelectNewAddress: () => void;
  className?: string;
}

export function SavedAddressSelector({
  addresses,
  selectedAddressId,
  mode,
  onSelectAddress,
  onSelectNewAddress,
  className,
}: SavedAddressSelectorProps) {
  return (
    <div className={cn("space-y-4 pt-4 border-t border-[var(--kit-border)]", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[var(--kit-text-primary)]">
          Shipping Address
        </h2>
        <span className="text-xs text-[var(--kit-muted-fg)]">
          Select a delivery destination
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {addresses.map((addr) => {
          const isSelected = mode === "saved" && selectedAddressId === addr.id;

          return (
            <button
              key={addr.id}
              type="button"
              onClick={() => onSelectAddress(addr.id)}
              className={cn(
                "relative flex flex-col text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer min-h-[110px]",
                isSelected
                  ? "border-[var(--kit-accent)] bg-[var(--kit-accent)]/5 shadow-xs ring-1 ring-[var(--kit-accent)]"
                  : "border-[var(--kit-border)] bg-[var(--kit-card)] hover:border-[var(--kit-accent)]/50"
              )}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isSelected ? "text-[var(--kit-accent)]" : "text-[var(--kit-muted-fg)]"
                  )} />
                  <span className="text-xs font-bold text-[var(--kit-text-primary)] truncate">
                    {addr.label || "Address"}
                  </span>
                  {addr.is_default && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] shrink-0">
                      Default
                    </span>
                  )}
                </div>

                <div
                  className={cn(
                    "h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                    isSelected
                      ? "border-[var(--kit-accent)] bg-[var(--kit-accent)] text-[var(--kit-accent-fg)]"
                      : "border-[var(--kit-border)] bg-[var(--kit-surface)]"
                  )}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                </div>
              </div>

              <div className="text-xs text-[var(--kit-muted-fg)] space-y-0.5 mt-auto">
                <p className="text-[var(--kit-text-primary)] font-medium truncate">
                  {addr.street_line_1}
                  {addr.street_line_2 ? `, ${addr.street_line_2}` : ""}
                </p>
                <p className="truncate">
                  {addr.city}, {addr.state} ({addr.country})
                </p>
              </div>
            </button>
          );
        })}

        {/* Use a new address card */}
        <button
          type="button"
          onClick={onSelectNewAddress}
          className={cn(
            "relative flex flex-col justify-center items-center text-center p-4 rounded-xl border border-dashed transition-all duration-200 cursor-pointer min-h-[110px]",
            mode === "new"
              ? "border-[var(--kit-accent)] bg-[var(--kit-accent)]/5 shadow-xs ring-1 ring-[var(--kit-accent)]"
              : "border-[var(--kit-border)] bg-[var(--kit-card)]/50 hover:border-[var(--kit-accent)]/50"
          )}
        >
          <div
            className={cn(
              "h-8 w-8 rounded-full border flex items-center justify-center mb-1.5 transition-colors",
              mode === "new"
                ? "border-[var(--kit-accent)] bg-[var(--kit-accent)] text-[var(--kit-accent-fg)]"
                : "border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-muted-fg)]"
            )}
          >
            {mode === "new" ? (
              <Check className="h-4 w-4 stroke-[3]" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </div>
          <span className="text-xs font-bold text-[var(--kit-text-primary)]">
            Use a new address
          </span>
          <span className="text-[11px] text-[var(--kit-muted-fg)] mt-0.5">
            Deliver to a different location
          </span>
        </button>
      </div>
    </div>
  );
}
