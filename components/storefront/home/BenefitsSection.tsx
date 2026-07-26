/**
 * components/storefront/home/BenefitsSection.tsx
 *
 * Server Component. Trust signal / benefits strip.
 * Driven by `benefitsConfig` in `config/storefront.ts`.
 *
 * Icons are resolved from a static map to avoid bundling all of lucide-react.
 */

import {
  Truck,
  ShieldCheck,
  RefreshCcw,
  MessageCircle,
  Package,
  Clock,
  Star,
  Zap,
  LucideIcon,
} from "lucide-react";
import { benefitsConfig } from "@/config/storefront";

/** Map of icon name string → Lucide component. Extend as needed. */
const ICON_MAP: Record<string, LucideIcon> = {
  Truck,
  ShieldCheck,
  RefreshCcw,
  MessageCircle,
  Package,
  Clock,
  Star,
  Zap,
};

export function BenefitsSection() {
  return (
    <section className="bg-[var(--kit-surface)] border-y border-[var(--kit-border)] py-10 sm:py-12">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
          {benefitsConfig.map((benefit) => {
            const Icon = ICON_MAP[benefit.icon] ?? Package;

            return (
              <div
                key={benefit.label}
                className="flex flex-col items-center text-center gap-3"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kit-accent)]/10 text-[var(--kit-accent)]">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--kit-text-primary)]">
                    {benefit.label}
                  </p>
                  <p className="text-xs text-[var(--kit-muted-fg)] mt-0.5 leading-snug">
                    {benefit.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
