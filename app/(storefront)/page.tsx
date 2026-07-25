/**
 * app/(storefront)/page.tsx
 *
 * Storefront Homepage — Server Component.
 * Inherits layout from app/(storefront)/layout.tsx.
 *
 * In Batch 2, this renders a clean hero placeholder matching siteConfig.
 * Batch 5 will populate this page with all 8 configurable storefront sections.
 */

import Link from "next/link";
import { siteConfig } from "@/config/site";
import { heroConfig } from "@/config/storefront";
import { ROUTES } from "@/constants/routes";
import { ArrowRight, ShoppingBag } from "lucide-react";

export default function StorefrontHomePage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section Placeholder */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[var(--kit-surface)] via-[var(--kit-bg)] to-[var(--kit-bg)] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center border-b border-[var(--kit-border)]">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--kit-accent)]/10 px-3.5 py-1 text-xs font-semibold text-[var(--kit-accent)] border border-[var(--kit-accent)]/20">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Storefront Shell Active</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--kit-text-primary)]">
            {heroConfig.heading}
          </h1>

          <p className="mx-auto max-w-xl text-sm sm:text-base text-[var(--kit-muted-fg)] leading-relaxed">
            {heroConfig.subheading}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href={ROUTES.catalog}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--kit-accent)] px-6 py-3 text-sm font-semibold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[44px] shadow-sm"
            >
              <span>{heroConfig.primaryCta}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            {heroConfig.secondaryCta && (
              <Link
                href={heroConfig.secondaryCtaHref ?? ROUTES.catalog}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] px-6 py-3 text-sm font-semibold text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors min-h-[44px]"
              >
                <span>{heroConfig.secondaryCta}</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Placeholder status grid */}
      <section className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8 w-full">
        <div className="rounded-xl border border-[var(--kit-border)] bg-[var(--kit-surface)] p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--kit-muted-fg)]">
            Storefront Foundation Shell (Batch 2)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-[var(--kit-card)] border border-[var(--kit-border)]">
              <span className="font-semibold block text-[var(--kit-text-primary)]">
                Header & Nav
              </span>
              <span className="text-[var(--kit-muted-fg)]">
                Sticky header, logo ({siteConfig.name}), desktop nav, cart badge
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[var(--kit-card)] border border-[var(--kit-border)]">
              <span className="font-semibold block text-[var(--kit-text-primary)]">
                Cart & Menu Drawers
              </span>
              <span className="text-[var(--kit-muted-fg)]">
                Zustand-powered UI drawers with animations & backdrop blur
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[var(--kit-card)] border border-[var(--kit-border)]">
              <span className="font-semibold block text-[var(--kit-text-primary)]">
                Config-Driven Footer
              </span>
              <span className="text-[var(--kit-muted-fg)]">
                100% config-driven footer columns & contact details
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
