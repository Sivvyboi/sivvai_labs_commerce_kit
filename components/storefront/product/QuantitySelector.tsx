"use client";

/**
 * components/storefront/product/QuantitySelector.tsx
 *
 * Touch-friendly quantity selector with minus/plus buttons and direct numeric input.
 * Ensures WCAG 2.5.5 minimum 44px touch targets.
 */

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface QuantitySelectorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Current quantity value */
  value: number;
  /** Minimum quantity allowed. Defaults to 1 */
  min?: number;
  /** Maximum quantity allowed (e.g. available stock). Defaults to 99 */
  max?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Callback fired when quantity changes */
  onChange: (value: number) => void;
}

export function QuantitySelector({
  value,
  min = 1,
  max = 99,
  disabled = false,
  onChange,
  className,
  ...props
}: QuantitySelectorProps) {
  const handleDecrement = () => {
    if (value > min && !disabled) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max && !disabled) {
      onChange(value + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === "") return; // Allow typing
    const num = parseInt(rawVal, 10);
    if (!isNaN(num)) {
      const clamped = Math.min(max, Math.max(min, num));
      onChange(clamped);
    }
  };

  const isMinReached = value <= min || disabled;
  const isMaxReached = value >= max || disabled;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-[var(--kit-border)] bg-[var(--kit-bg)] shadow-xs",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      {/* Minus Button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={isMinReached}
        aria-label="Decrease quantity"
        className="flex h-11 w-11 items-center justify-center rounded-l-lg text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kit-accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px]"
      >
        <Minus className="h-4 w-4" />
      </button>

      {/* Direct Input Field */}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={handleInputChange}
        aria-label="Quantity"
        className="h-11 w-12 text-center text-sm font-semibold bg-transparent text-[var(--kit-text-primary)] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      {/* Plus Button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={isMaxReached}
        aria-label="Increase quantity"
        className="flex h-11 w-11 items-center justify-center rounded-r-lg text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kit-accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px]"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
