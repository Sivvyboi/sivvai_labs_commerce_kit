"use client";

/**
 * components/storefront/checkout/CouponInput.tsx
 *
 * Client Component. Promo / coupon code entry input with validation feedback.
 */

import { useState } from "react";
import { Tag, Check, X, Loader2 } from "lucide-react";
import { Price } from "@/components/shared/Price";
import { cn } from "@/lib/utils/cn";

export interface CouponInputProps {
  appliedCoupon: string | null;
  discountAmount: number;
  onApply: (code: string) => Promise<void>;
  onRemove: () => void;
  className?: string;
}

export function CouponInput({
  appliedCoupon,
  discountAmount,
  onApply,
  onRemove,
  className,
}: CouponInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || loading) return;
    setLoading(true);
    try {
      await onApply(code);
    } finally {
      setLoading(false);
    }
  };

  if (appliedCoupon) {
    return (
      <div className={cn("flex items-center justify-between p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold", className)}>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>Promo &quot;{appliedCoupon}&quot; applied</span>
          <span className="font-bold">
            (-<Price amount={discountAmount} size="sm" />)
          </span>
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove coupon"
          className="p-1 hover:opacity-80 transition-opacity text-emerald-700 dark:text-emerald-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex gap-2", className)}>
      <div className="relative flex-1">
        <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="PROMO CODE"
          className="w-full rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] pl-10 pr-3 py-2.5 text-xs sm:text-sm font-semibold uppercase text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] min-h-[44px]"
        />
      </div>

      <button
        type="submit"
        disabled={!code.trim() || loading}
        className="px-4 py-2.5 rounded-xl bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] text-xs font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity min-h-[44px]"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
      </button>
    </form>
  );
}
