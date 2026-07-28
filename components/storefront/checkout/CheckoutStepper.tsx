"use client";

/**
 * components/storefront/checkout/CheckoutStepper.tsx
 *
 * Client Component. Accessible 4-step checkout stepper navigation header:
 *  Step 1: Address & Contact
 *  Step 2: Shipping Method
 *  Step 3: Review Order
 *  Step 4: Payment
 */

import type { CheckoutStep } from "@/features/storefront/hooks/useCheckout";
import { Check, MapPin, Truck, ClipboardList, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CheckoutStepperProps {
  currentStep: CheckoutStep;
  onStepClick: (step: CheckoutStep) => void;
  className?: string;
}

const STEPS = [
  { id: 1 as CheckoutStep, label: "Address", icon: MapPin },
  { id: 2 as CheckoutStep, label: "Shipping", icon: Truck },
  { id: 3 as CheckoutStep, label: "Review", icon: ClipboardList },
  { id: 4 as CheckoutStep, label: "Payment", icon: CreditCard },
];

export function CheckoutStepper({
  currentStep,
  onStepClick,
  className,
}: CheckoutStepperProps) {
  return (
    <nav
      aria-label="Checkout Progress"
      className={cn("w-full py-4 select-none", className)}
    >
      <ol className="flex items-center justify-between w-full relative">
        {STEPS.map((s, index) => {
          const isCompleted = s.id < currentStep;
          const isCurrent = s.id === currentStep;
          const Icon = s.icon;

          return (
            <li
              key={s.id}
              className="relative flex-1 flex flex-col items-center group"
            >
              {/* Connector line to next step */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "absolute top-5 left-1/2 w-full h-0.5 -z-10 transition-colors duration-300",
                    isCompleted ? "bg-[var(--kit-accent)]" : "bg-[var(--kit-border)]"
                  )}
                />
              )}

              {/* Step Circle Button */}
              <button
                type="button"
                onClick={() => isCompleted && onStepClick(s.id)}
                disabled={!isCompleted && !isCurrent}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${s.id}: ${s.label}`}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kit-accent)] min-h-[40px] min-w-[40px]",
                  isCompleted
                    ? "bg-[var(--kit-accent)] border-[var(--kit-accent)] text-[var(--kit-accent-fg)] cursor-pointer hover:opacity-90"
                    : isCurrent
                      ? "bg-[var(--kit-bg)] border-[var(--kit-accent)] text-[var(--kit-accent)] ring-4 ring-[var(--kit-accent)]/15 scale-105"
                      : "bg-[var(--kit-surface)] border-[var(--kit-border)] text-[var(--kit-muted-fg)] cursor-not-allowed"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 stroke-[3]" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </button>

              {/* Step Title Label */}
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center transition-colors truncate max-w-[80px]",
                  isCurrent
                    ? "text-[var(--kit-accent)] font-bold"
                    : isCompleted
                      ? "text-[var(--kit-text-primary)]"
                      : "text-[var(--kit-muted-fg)]"
                )}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
