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
    <section className="relative overflow-hidden border-b border-[var(--kit-border)] bg-[var(--kit-bg)]">
      {/* Background Image & Directional Scrim */}
      {isImageBg && (
        <div className="absolute inset-0 z-0">
          <Image
            src={heroConfig.backgroundImage!}
            alt="Storefront cover banner"
            fill
            priority
            quality={100}
            unoptimized
            sizes="100vw"
            className="object-cover object-[78%_12%] sm:object-[70%_20%] lg:object-[left_center]"
          />

          {/* Mobile Overlay: Clear at the top so the models stay razor sharp; fades smoothly down for the text */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--kit-bg)]/40 to-[var(--kit-bg)] via-50% to-85% lg:hidden" />

          {/* Desktop Overlay: Light directional scrim solely behind the left-aligned text; completely clear across the models */}
          <div className="hidden lg:block absolute inset-0 bg-gradient-to-r from-[var(--kit-bg)]/85 via-[var(--kit-bg)]/30 to-transparent via-25% to-42%" />
        </div>
      )}

      {/* Content Container */}
      <div className="relative z-10 mx-auto max-w-screen-xl px-4 pt-24 pb-8 sm:pt-36 sm:pb-12 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center min-h-[380px] sm:min-h-[420px] lg:min-h-[480px]">
          {/* Text & CTAs Column */}
          <div className="lg:col-span-7 xl:col-span-6">
            <div className="mx-auto lg:mx-0 max-w-xl space-y-4 sm:space-y-6 text-center lg:text-left rounded-2xl sm:rounded-3xl p-5 sm:p-7 lg:p-8 bg-[var(--kit-bg)]/55 dark:bg-[var(--kit-bg)]/65 backdrop-blur-md border border-[var(--kit-border)]/60 shadow-lg shadow-black/[0.04] dark:shadow-black/30">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--kit-bg)]/90 px-3.5 py-1 text-xs font-semibold text-[var(--kit-accent)] border border-[var(--kit-accent)]/30 shadow-xs backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Social Commerce Powered</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--kit-text-primary)] leading-[1.15] drop-shadow-sm [text-shadow:0_1px_2px_rgba(0,0,0,0.08)] dark:[text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
                {heroConfig.heading}
              </h1>

              <p className="mx-auto lg:mx-0 max-w-xl text-sm sm:text-base lg:text-lg text-[var(--kit-text-primary)]/85 leading-relaxed font-medium [text-shadow:0_1px_1px_rgba(0,0,0,0.06)] dark:[text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
                {heroConfig.subheading}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2.5 sm:gap-3 pt-1 sm:pt-2">
                <Link
                  href={heroConfig.primaryCtaHref ?? ROUTES.catalog}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--kit-accent)] px-6 py-3 text-sm font-semibold text-[var(--kit-accent-fg)] hover:opacity-90 active:scale-[0.98] transition-all min-h-[44px] shadow-sm"
                >
                  <span>{heroConfig.primaryCta}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                {heroConfig.secondaryCta && (
                  <Link
                    href={heroConfig.secondaryCtaHref ?? ROUTES.collections}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)]/95 backdrop-blur-sm px-6 py-3 text-sm font-semibold text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] active:scale-[0.98] transition-all min-h-[44px] shadow-xs"
                  >
                    <span>{heroConfig.secondaryCta}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Graphic / Visual Card Column (Only shown when no custom background image is used) */}
          {!isImageBg && (
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
          )}
        </div>
      </div>
    </section>
  );
}
