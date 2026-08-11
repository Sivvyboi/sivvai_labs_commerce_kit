"use client";

/**
 * components/shared/Price.tsx
 *
 * Reusable currency formatter component.
 * Supports current price, compare-at price (strike-through), and size variations.
 * Server and Client Component compatible.
 * Renders an inline <span> to remain valid phrasing content inside <p>, <h3>, buttons, etc.
 */

import * as React from "react";
import { formatCurrency } from "@/lib/utils/format";
import { useCurrency } from "@/components/shared/CurrencyProvider";
import { cn } from "@/lib/utils/cn";

export interface PriceProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Numeric price amount in major units (e.g. 150 for 150.00) */
  amount: number;
  /** Optional compare-at price for sale items */
  originalAmount?: number;
  /** Currency code override. Defaults to store settings currency */
  currency?: string;
  /** Text sizing variant */
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "text-xs font-medium",
  md: "text-sm font-semibold",
  lg: "text-base sm:text-lg font-bold",
  xl: "text-xl sm:text-2xl font-extrabold",
};

const originalSizeClasses = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-xs sm:text-sm",
  xl: "text-sm sm:text-base",
};

export function Price({
  amount,
  originalAmount,
  currency: currencyProp,
  size = "md",
  className,
  ...props
}: PriceProps) {
  const storeCurrency = useCurrency();
  const currency = currencyProp || storeCurrency;

  const formattedPrice = formatCurrency(amount, currency);
  const isOnSale = originalAmount !== undefined && originalAmount > amount;
  const formattedOriginalPrice = isOnSale
    ? formatCurrency(originalAmount, currency)
    : null;

  return (
    <span
      className={cn("inline-flex items-baseline gap-1.5 flex-wrap", className)}
      aria-label={
        isOnSale
          ? `On sale for ${formattedPrice}, original price ${formattedOriginalPrice}`
          : `Price: ${formattedPrice}`
      }
      {...props}
    >
      {/* Current Active Price */}
      <span className={cn(sizeClasses[size], "text-[var(--kit-text-primary)]")}>
        {formattedPrice}
      </span>

      {/* Compare-at Strikethrough Price */}
      {isOnSale && formattedOriginalPrice && (
        <span
          className={cn(
            originalSizeClasses[size],
            "line-through text-[var(--kit-muted-fg)] font-normal"
          )}
        >
          {formattedOriginalPrice}
        </span>
      )}
    </span>
  );
}
