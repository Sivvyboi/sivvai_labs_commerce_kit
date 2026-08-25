"use client";

/**
 * components/storefront/checkout/ShippingMethodSelector.tsx
 *
 * Client Component. Authoritative radio selector for server-resolved shipping options.
 * Displays server-calculated delivery rates, estimates, free-shipping badges,
 * and handles unserviceable / loading states according to strict store rules.
 */

import * as React from "react";
import { Check, Loader2, AlertTriangle, Truck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Price } from "@/components/shared/Price";
import type { ResolvedShippingOption } from "@/services/shipping-service";

export interface ShippingMethodSelectorProps {
  options: ResolvedShippingOption[];
  isLoading: boolean;
  isServiceable: boolean;
  reason?: "unserviceable" | "no_methods" | "invalid_address" | string;
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string) => void;
  className?: string;
}

export function ShippingMethodSelector({
  options,
  isLoading,
  isServiceable,
  reason,
  selectedMethodId,
  onSelectMethod,
  className,
}: ShippingMethodSelectorProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[var(--kit-text-primary)] flex items-center gap-2">
          <Truck className="h-4 w-4 text-[var(--kit-accent)]" />
          Delivery & Shipping Method
        </h2>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-[var(--kit-text-muted)] animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating rates...
          </span>
        )}
      </div>

      {/* 1. Loading State */}
      {isLoading && options.length === 0 ? (
        <div className="flex items-center gap-3.5 p-6 rounded-xl border border-dashed border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-text-secondary)]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--kit-accent)] shrink-0" />
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-semibold text-[var(--kit-text-primary)]">
              Calculating available delivery methods...
            </p>
            <p className="text-[11px] text-[var(--kit-text-muted)]">
              Checking regional delivery zones and live shipping rates for your address.
            </p>
          </div>
        </div>
      ) : !isServiceable && reason === "unserviceable" ? (
        /* 2. Destination Not Serviceable (Step 14) */
        <div className="p-4 sm:p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-[var(--kit-text-primary)] space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Delivery Not Available</span>
          </div>
          <p className="text-xs text-[var(--kit-text-secondary)] leading-relaxed">
            We don&apos;t currently deliver to this address. Please check your shipping address or choose a different delivery location.
          </p>
        </div>
      ) : !isServiceable && reason === "no_methods" ? (
        /* 3. Matching Zone with No Active Methods (Step 15) */
        <div className="p-4 sm:p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-[var(--kit-text-primary)] space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>No Delivery Options Available</span>
          </div>
          <p className="text-xs text-[var(--kit-text-secondary)] leading-relaxed">
            No delivery options are currently available for this address. Please try another address or contact the store.
          </p>
        </div>
      ) : options.length === 0 ? (
        /* 4. Empty State / No Address Entered Yet */
        <div className="p-5 rounded-xl border border-dashed border-[var(--kit-border)] bg-[var(--kit-surface)] text-center text-xs text-[var(--kit-text-muted)]">
          Please enter or select a delivery address above to view available shipping options.
        </div>
      ) : (
        /* 5. Authoritative Shipping Options List */
        <div className="space-y-3" role="radiogroup" aria-label="Shipping Methods">
          {options.map((option) => {
            const isSelected = selectedMethodId === option.methodId;

            return (
              <div
                key={option.methodId}
                onClick={() => onSelectMethod(option.methodId)}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectMethod(option.methodId);
                  }
                }}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kit-accent)] gap-3 min-h-[56px]",
                  isSelected
                    ? "border-[var(--kit-accent)] bg-[var(--kit-accent)]/5 shadow-xs"
                    : "border-[var(--kit-border)] bg-[var(--kit-card)] hover:border-[var(--kit-accent)]/50"
                )}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border transition-colors shrink-0 mt-0.5 sm:mt-0",
                      isSelected
                        ? "border-[var(--kit-accent)] bg-[var(--kit-accent)] text-white"
                        : "border-[var(--kit-border)] bg-[var(--kit-surface)]"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-bold text-[var(--kit-text-primary)]">
                        {option.name}
                      </p>
                      {option.isFree && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Free
                        </span>
                      )}
                    </div>
                    {option.description && (
                      <p className="text-[11px] text-[var(--kit-text-secondary)]">
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:text-right border-t sm:border-t-0 border-[var(--kit-border)]/50 pt-2 sm:pt-0">
                  <div className="text-[11px] text-[var(--kit-text-muted)] font-medium">
                    {option.estimatedDaysMin && option.estimatedDaysMax
                      ? option.estimatedDaysMin === option.estimatedDaysMax
                        ? `${option.estimatedDaysMin} day delivery`
                        : `${option.estimatedDaysMin}–${option.estimatedDaysMax} business days`
                      : "Standard delivery"}
                  </div>

                  <div className="text-sm font-bold text-[var(--kit-text-primary)]">
                    {option.isFree || option.amount === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                        FREE
                      </span>
                    ) : (
                      <Price amount={option.amount} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
