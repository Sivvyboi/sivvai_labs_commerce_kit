/**
 * app/(storefront)/page.tsx
 *
 * Storefront Homepage — Root Server Component.
 * Inherits layout from app/(storefront)/layout.tsx.
 *
 * Streaming Strategy:
 *  - Hero renders immediately (static, no I/O).
 *  - Each data-fetching section is wrapped in its own independent <Suspense>.
 *  - Async sections stream in parallel — no sequential waterfall.
 *  - ProductGrid skeletons act as Suspense fallbacks.
 *
 * Section order:
 *  1. HeroSection           (static)
 *  2. FeaturedProductsSection   (Suspense)
 *  3. FeaturedCollectionsSection (Suspense)
 *  4. CategoriesSection         (Suspense)
 *  5. PromoBannerSection        (static, config-driven)
 *  6. BenefitsSection           (static, config-driven)
 *  7. TestimonialsSection        (Suspense, feature-flagged)
 *  8. NewsletterSection          (Suspense, feature-flagged, Client)
 */

import { Suspense } from "react";
import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { heroConfig, homepageSections } from "@/config/storefront";
import { featureFlag } from "@/config/feature-flags";

import { HeroSection } from "@/components/storefront/home/HeroSection";
import { FeaturedProductsSection } from "@/components/storefront/home/FeaturedProductsSection";
import { FeaturedCollectionsSection } from "@/components/storefront/home/FeaturedCollectionsSection";
import { CategoriesSection } from "@/components/storefront/home/CategoriesSection";
import { PromoBannerSection } from "@/components/storefront/home/PromoBannerSection";
import { BenefitsSection } from "@/components/storefront/home/BenefitsSection";
import { TestimonialsSection } from "@/components/storefront/home/TestimonialsSection";
import { NewsletterSection } from "@/components/storefront/home/NewsletterSection";
import { ProductGrid } from "@/components/storefront/product/ProductGrid";

// ---------------------------------------------------------------------------
// Page Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${heroConfig.heading}`,
  description: `${heroConfig.subheading} | ${siteConfig.tagline}`,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${heroConfig.heading}`,
    description: `${heroConfig.subheading} | ${siteConfig.tagline}`,
    url: siteConfig.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${heroConfig.heading}`,
    description: heroConfig.subheading,
  },
  alternates: {
    canonical: siteConfig.url,
  },
};

// ---------------------------------------------------------------------------
// Skeleton Fallbacks
// ---------------------------------------------------------------------------

/** Skeleton for featured products — 2 rows × 4 cols */
function ProductsSkeleton() {
  return (
    <section className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="h-8 w-48 rounded-lg bg-[var(--kit-surface)] animate-pulse mb-8" />
      <ProductGrid loading skeletonCount={8} />
    </section>
  );
}

/** Generic card skeleton row */
function CardRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <section className="bg-[var(--kit-surface)] border-y border-[var(--kit-border)] py-12 sm:py-16">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="h-7 w-56 rounded-lg bg-[var(--kit-border)] animate-pulse" />
        <div
          className="grid gap-4 sm:gap-6"
          style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl bg-[var(--kit-border)] animate-pulse"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Categories strip skeleton */
function CategoriesSkeleton() {
  return (
    <section className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 space-y-6">
      <div className="h-7 w-40 rounded-lg bg-[var(--kit-surface)] animate-pulse" />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-[var(--kit-surface)] animate-pulse" />
        ))}
      </div>
    </section>
  );
}

/** Testimonials skeleton */
function TestimonialsSkeleton() {
  return (
    <section className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 space-y-6">
      <div className="h-7 w-64 rounded-lg bg-[var(--kit-surface)] animate-pulse mx-auto" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-[var(--kit-surface)] animate-pulse" />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Organization JSON-LD
// ---------------------------------------------------------------------------

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
  contactPoint: {
    "@type": "ContactPoint",
    telephone: siteConfig.contact.phone,
    contactType: "customer support",
  },
  ...(siteConfig.contact.instagram && {
    sameAs: [
      `https://instagram.com/${siteConfig.contact.instagram}`,
      ...(siteConfig.contact.tiktok
        ? [`https://tiktok.com/@${siteConfig.contact.tiktok}`]
        : []),
      ...(siteConfig.contact.facebook
        ? [`https://facebook.com/${siteConfig.contact.facebook}`]
        : []),
    ],
  }),
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function StorefrontHomePage() {
  return (
    <>
      {/* Organization JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      <main id="main-content">
        {/* 1. Hero — renders immediately, no Suspense needed */}
        {homepageSections.hero && <HeroSection />}

        {/* 2. Featured Products — streams independently */}
        {homepageSections.featuredProducts && (
          <Suspense fallback={<ProductsSkeleton />}>
            <FeaturedProductsSection />
          </Suspense>
        )}

        {/* 3. Featured Collections — streams independently */}
        {homepageSections.featuredCollections && (
          <Suspense fallback={<CardRowSkeleton count={3} />}>
            <FeaturedCollectionsSection />
          </Suspense>
        )}

        {/* 4. Categories — streams independently */}
        {homepageSections.categories && (
          <Suspense fallback={<CategoriesSkeleton />}>
            <CategoriesSection />
          </Suspense>
        )}

        {/* 5. Promo Banner — static config, no Suspense */}
        {homepageSections.promoBanner && <PromoBannerSection />}

        {/* 6. Benefits / Trust Signals — static config, no Suspense */}
        {homepageSections.benefits && <BenefitsSection />}

        {/* 7. Testimonials — feature-flagged, streams independently */}
        {homepageSections.testimonials && featureFlag.testimonials && (
          <Suspense fallback={<TestimonialsSkeleton />}>
            <TestimonialsSection />
          </Suspense>
        )}

        {/* 8. Newsletter — feature-flagged Client Component, streams independently */}
        {homepageSections.newsletter && featureFlag.newsletter && (
          <Suspense fallback={null}>
            <NewsletterSection />
          </Suspense>
        )}
      </main>
    </>
  );
}
