/**
 * components/storefront/home/PromoBannerSection.tsx
 *
 * Server Component. Promotional banner section for homepage discounts & new arrivals.
 * Driven by `promoBannerConfig` in `config/storefront.ts`.
 */

import Link from "next/link";
import { promoBannerConfig } from "@/config/storefront";
import { ArrowRight, Tag } from "lucide-react";

export function PromoBannerSection() {
  if (!promoBannerConfig.enabled) {
    return null;
  }

  return (
    <section className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--kit-accent)] via-[#8b5cf6] to-[#6366f1] p-8 sm:p-12 text-white shadow-lg">
        {/* Background Decorative Circles */}
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-black/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold backdrop-blur-xs">
              <Tag className="h-3.5 w-3.5" />
              <span>Special Offer</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {promoBannerConfig.heading}
            </h2>
            <p className="max-w-xl text-xs sm:text-sm text-white/90 leading-relaxed">
              {promoBannerConfig.subheading}
            </p>
          </div>

          <Link
            href={promoBannerConfig.ctaHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-xs sm:text-sm font-bold text-[var(--kit-accent)] hover:bg-white/90 transition-colors shadow-md shrink-0 min-h-[44px]"
          >
            <span>{promoBannerConfig.ctaLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
