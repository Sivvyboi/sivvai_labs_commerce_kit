"use client";

/**
 * components/storefront/checkout/PaymentMethodSelector.tsx
 *
 * Client Component. Selection UI for configured payment providers (Paystack, Flutterwave, Bank Transfer).
 */

import { CreditCard, Landmark, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface PaymentMethodSelectorProps {
  selectedProvider: string;
  onSelectProvider: (provider: string) => void;
  className?: string;
}

const PROVIDERS = [
  {
    id: "paystack",
    name: "Paystack",
    description: "Pay with Debit Card, Bank Transfer, or USSD",
    icon: CreditCard,
    enabled: true,
  },
  {
    id: "flutterwave",
    name: "Flutterwave",
    description: "Pay via Cards, Mobile Money, or Bank Transfer",
    icon: CreditCard,
    enabled: true,
  },
  {
    id: "bank_transfer",
    name: "Bank Transfer",
    description: "Direct wire transfer to merchant account",
    icon: Landmark,
    enabled: true,
  },
];

export function PaymentMethodSelector({
  selectedProvider,
  onSelectProvider,
  className,
}: PaymentMethodSelectorProps) {
  const activeProviders = PROVIDERS.filter((p) => p.enabled);

  return (
    <div className={cn("space-y-4", className)}>
      <h2 className="text-base font-bold text-[var(--kit-text-primary)]">
        Select Payment Option
      </h2>

      <div className="space-y-3" role="radiogroup" aria-label="Payment Options">
        {activeProviders.map((provider) => {
          const isSelected = selectedProvider === provider.id;
          const Icon = provider.icon;

          return (
            <div
              key={provider.id}
              onClick={() => onSelectProvider(provider.id)}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectProvider(provider.id);
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

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--kit-surface)] text-[var(--kit-accent)] shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs sm:text-sm font-bold text-[var(--kit-text-primary)]">
                      {provider.name}
                    </p>
                    <p className="text-[11px] text-[var(--kit-muted-fg)]">
                      {provider.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
