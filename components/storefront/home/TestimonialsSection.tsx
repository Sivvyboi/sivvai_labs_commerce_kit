/**
 * components/storefront/home/TestimonialsSection.tsx
 *
 * Server Component. Customer testimonials section.
 * Only rendered when `featureFlag.testimonials === true`.
 * Content is statically driven by `testimonialsConfig` in `config/storefront.ts`.
 */

import { testimonialsConfig } from "@/config/storefront";
import { featureFlag } from "@/config/feature-flags";
import { Star } from "lucide-react";

function StarRow({ rating }: { rating: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating
              ? "fill-[var(--kit-warning)] text-[var(--kit-warning)]"
              : "fill-none text-[var(--kit-border)]"
          }`}
        />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  if (!featureFlag.testimonials) {
    return null;
  }

  return (
    <section className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--kit-text-primary)]">
          What our customers say
        </h2>
        <p className="text-xs sm:text-sm text-[var(--kit-muted-fg)] mt-2">
          Real feedback from real shoppers.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {testimonialsConfig.map((t, idx) => (
          <article
            key={idx}
            className="flex flex-col gap-4 p-5 rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-xs"
          >
            {/* Stars */}
            <StarRow rating={t.rating} />

            {/* Quote */}
            <p className="text-sm text-[var(--kit-text-primary)] leading-relaxed flex-1">
              &ldquo;{t.text}&rdquo;
            </p>

            {/* Author */}
            <div className="flex items-center gap-3 pt-2 border-t border-[var(--kit-border)]">
              {/* Fallback Avatar Initials */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] text-xs font-bold uppercase">
                {t.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--kit-text-primary)]">
                  {t.name}
                </p>
                {t.handle && (
                  <p className="text-xs text-[var(--kit-muted-fg)]">{t.handle}</p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
