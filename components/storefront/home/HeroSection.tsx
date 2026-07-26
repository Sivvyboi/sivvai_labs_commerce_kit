/**
 * components/storefront/home/HeroSection.tsx
 *
 * Server Component. Top hero banner section for the storefront homepage.
 * Driven entirely by `heroConfig` in `config/storefront.ts`.
 *
 * Layout:
 *  - Stacked on mobile viewports
 *  - Split / side-by-side on desktop viewports
 *  - Supports gradient or full-bleed image background
 */

import Link from "next/link";
import Image from "next/image";
import { heroConfig } from "@/config/storefront";
import { ROUTES } from "@/constants/routes";
import { ArrowRight, Sparkles } from "lucide-react";

export function HeroSection() {
  const isImageBg = heroConfig.backgroundType === "image" && heroConfig.backgroundImage;

  return (
    <section className="relative overflow-hidden border-b border-[var(--kit-border)]">
      {/* Optional Background Image */}
      {isImageBg && (
        <div className="absolute inset-0 z-0">
          <Image
            src={heroConfig.backgroundImage!}
            alt="Hero background"
            fill
            priority
            className="object-cover object-center opacity-20 dark:opacity-15"
          />
        </div>
      )}

      {/* Content Container */}
      <div className="relative z-10 mx-auto max-w-screen-xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Text & CTAs Column */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--kit-accent)]/10 px-3.5 py-1 text-xs font-semibold text-[var(--kit-accent)] border border-[var(--kit-accent)]/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Social Commerce Powered</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--kit-text-primary)] leading-[1.15]">
              {heroConfig.heading}
            </h1>

            <p className="mx-auto lg:mx-0 max-w-2xl text-sm sm:text-base lg:text-lg text-[var(--kit-muted-fg)] leading-relaxed">
              {heroConfig.subheading}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <Link
                href={heroConfig.primaryCtaHref ?? ROUTES.catalog}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--kit-accent)] px-6 py-3 text-sm font-semibold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[44px] shadow-sm"
              >
                <span>{heroConfig.primaryCta}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              {heroConfig.secondaryCta && (
                <Link
                  href={heroConfig.secondaryCtaHref ?? ROUTES.collections}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] px-6 py-3 text-sm font-semibold text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors min-h-[44px]"
                >
                  <span>{heroConfig.secondaryCta}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Graphic / Visual Card Column (Desktop split layout) */}
          <div className="lg:col-span-5 hidden lg:block">
            <div className="relative aspect-4/3 w-full rounded-2xl border border-[var(--kit-border)] bg-gradient-to-tr from-[var(--kit-accent)]/20 via-[var(--kit-surface)] to-[var(--kit-card)] p-6 shadow-lg flex flex-col justify-between overflow-hidden">
              <div className="space-y-2">
                <div className="h-2 w-16 rounded bg-[var(--kit-accent)]" />
                <p className="text-xl font-bold text-[var(--kit-text-primary)]">
                  Fast & Seamless Shopping
                </p>
                <p className="text-xs text-[var(--kit-muted-fg)]">
                  Pay via Card, Transfer, or order directly on WhatsApp.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[var(--kit-border)]">
                <div className="h-10 w-10 rounded-full bg-[var(--kit-accent)]/10 flex items-center justify-center text-[var(--kit-accent)] font-bold text-xs">
                  ✓
                </div>
                <div className="text-xs">
                  <span className="font-semibold block text-[var(--kit-text-primary)]">
                    Direct Delivery
                  </span>
                  <span className="text-[var(--kit-muted-fg)]">
                    Lagos same-day delivery available
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
