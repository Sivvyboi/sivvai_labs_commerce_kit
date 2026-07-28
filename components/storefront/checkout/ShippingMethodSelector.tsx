"use client";

/**
 * components/storefront/checkout/ShippingMethodSelector.tsx
 *
 * Client Component. Radio selector for active fulfilment methods.
 */

import { useEffect, useState } from "react";
import type { FulfilmentMethodRow } from "@/lib/db/shipping";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ShippingMethodSelectorProps {
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string) => void;
  subtotal?: number;
  className?: string;
}

export function ShippingMethodSelector({
  selectedMethodId,
  onSelectMethod,
  className,
}: ShippingMethodSelectorProps) {
  const [methods, setMethods] = useState<FulfilmentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMethods() {
      try {
        const res = await fetch("/api/shipping/methods");
        if (res.ok) {
          const json = await res.json();
          const list: FulfilmentMethodRow[] = json.data ?? json.methods ?? [];
          setMethods(list);

          // Auto-select first method if none selected yet
          if (!selectedMethodId && list.length > 0) {
            onSelectMethod(list[0].id);
          }
        }
      } catch {
        // Fallback
        const fallback: FulfilmentMethodRow[] = [
          {
            id: "standard",
            type: "standard",
            name: "Standard Shipping",
            description: "Delivered in 2-4 business days",
            is_enabled: true,
            estimated_days_min: 2,
            estimated_days_max: 4,
            created_at: "",
            updated_at: "",
          },
          {
            id: "express",
            type: "express",
            name: "Express Delivery",
            description: "Same day or next day dispatch",
            is_enabled: true,
            estimated_days_min: 1,
            estimated_days_max: 2,
            created_at: "",
            updated_at: "",
          },
        ];
        setMethods(fallback);
        if (!selectedMethodId) onSelectMethod(fallback[0].id);
      } finally {
        setLoading(false);
      }
    }

    fetchMethods();
  }, [selectedMethodId, onSelectMethod]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-[var(--kit-muted-fg)] gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--kit-accent)]" />
        <span className="text-xs">Loading shipping options...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <h2 className="text-base font-bold text-[var(--kit-text-primary)]">
        Shipping Method
      </h2>

      <div className="space-y-3" role="radiogroup" aria-label="Shipping Methods">
        {methods.map((method) => {
          const isSelected = selectedMethodId === method.id;

          return (
            <div
              key={method.id}
              onClick={() => onSelectMethod(method.id)}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectMethod(method.id);
                }
              }}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kit-accent)] min-h-[48px]",
                isSelected
                  ? "border-[var(--kit-accent)] bg-[var(--kit-accent)]/5 shadow-xs"
                  : "border-[var(--kit-border)] bg-[var(--kit-card)] hover:border-[var(--kit-accent)]/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border transition-colors shrink-0",
                    isSelected
                      ? "border-[var(--kit-accent)] bg-[var(--kit-accent)] text-[var(--kit-accent-fg)]"
                      : "border-[var(--kit-border)]"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs sm:text-sm font-bold text-[var(--kit-text-primary)]">
                    {method.name}
                  </p>
                  {method.description && (
                    <p className="text-[11px] text-[var(--kit-muted-fg)]">
                      {method.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-xs font-semibold text-[var(--kit-accent)]">
                {method.estimated_days_min && method.estimated_days_max
                  ? `${method.estimated_days_min}-${method.estimated_days_max} days`
                  : "Fast Shipping"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
