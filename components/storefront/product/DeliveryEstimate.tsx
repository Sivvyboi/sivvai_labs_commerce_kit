"use client";

/**
 * components/storefront/product/DeliveryEstimate.tsx
 *
 * Client Component. Displays estimated delivery windows, fulfilment methods,
 * and shipping rate highlights for the product detail page.
 */

import { useEffect, useState } from "react";
import type { FulfilmentMethodRow } from "@/lib/db/shipping";
import { Truck, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface DeliveryEstimateProps {
  className?: string;
}

export function DeliveryEstimate({ className }: DeliveryEstimateProps) {
  const [methods, setMethods] = useState<FulfilmentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMethods() {
      try {
        const res = await fetch("/api/shipping/methods");
        if (res.ok) {
          const json = await res.json();
          setMethods(json.data ?? json.methods ?? []);
        } else {
          // Default static fallback if API endpoint not present yet
          setMethods([
            {
              id: "standard",
              type: "standard",
              name: "Standard Delivery",
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
              name: "Express Dispatch",
              description: "Same day or next day dispatch",
              is_enabled: true,
              estimated_days_min: 1,
              estimated_days_max: 2,
              created_at: "",
              updated_at: "",
            },
          ]);
        }
      } catch {
        // Fallback
        setMethods([
          {
            id: "standard",
            type: "standard",
            name: "Standard Delivery",
            description: "Delivered in 2-4 business days",
            is_enabled: true,
            estimated_days_min: 2,
            estimated_days_max: 4,
            created_at: "",
            updated_at: "",
          },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchMethods();
  }, []);

  if (loading) {
    return (
      <div className={cn("rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-surface)]/50 p-4 space-y-3 animate-pulse", className)}>
        <div className="h-4 w-36 bg-[var(--kit-surface)] rounded-md" />
        <div className="h-10 bg-[var(--kit-surface)] rounded-xl" />
      </div>
    );
  }

  if (methods.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-surface)]/40 p-4 space-y-3 text-xs sm:text-sm text-[var(--kit-text-primary)]",
        className
      )}
    >
      <div className="flex items-center gap-2 font-semibold text-[var(--kit-text-primary)]">
        <Truck className="h-4 w-4 text-[var(--kit-accent)]" />
        <span>Delivery & Fulfilment</span>
      </div>

      <div className="divide-y divide-[var(--kit-border)]">
        {methods.map((method) => (
          <div key={method.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="font-semibold text-xs text-[var(--kit-text-primary)]">
                {method.name}
              </p>
              {method.description && (
                <p className="text-[11px] text-[var(--kit-muted-fg)] leading-relaxed">
                  {method.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[var(--kit-accent)] font-medium shrink-0 pt-0.5">
              <Clock className="h-3 w-3" />
              <span>Fast Shipping</span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-[var(--kit-border)] flex items-center gap-2 text-[11px] text-[var(--kit-muted-fg)]">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        <span>In-stock items ship within 24 hours with order tracking.</span>
      </div>
    </div>
  );
}
