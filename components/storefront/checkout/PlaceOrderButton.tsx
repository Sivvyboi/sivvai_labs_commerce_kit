"use client";

/**
 * components/storefront/checkout/PlaceOrderButton.tsx
 *
 * Client Component. Submit button executing session initiation,
 * inventory reservation, payment attempt creation, and provider redirect.
 */

import { Zap, Loader2, Lock } from "lucide-react";
import { Price } from "@/components/shared/Price";
import { cn } from "@/lib/utils/cn";

export interface PlaceOrderButtonProps {
  grandTotal: number;
  isSubmitting: boolean;
  onClick: () => void;
  disabled?: boolean;
  providerName?: string;
  className?: string;
}

export function PlaceOrderButton({
  grandTotal,
  isSubmitting,
  onClick,
  disabled = false,
  providerName = "Paystack",
  className,
}: PlaceOrderButtonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isSubmitting}
        className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[var(--kit-accent)] px-6 py-4 text-sm sm:text-base font-bold text-[var(--kit-accent-fg)] hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md min-h-[52px]"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Initiating Payment...</span>
          </>
        ) : (
          <>
            <Zap className="h-5 w-5 fill-current" />
            <span>
              Pay <Price amount={grandTotal} size="md" /> with {providerName}
            </span>
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--kit-muted-fg)]">
        <Lock className="h-3 w-3 text-emerald-500 shrink-0" />
        <span>Encrypted 256-bit SSL secure checkout</span>
      </div>
    </div>
  );
}
