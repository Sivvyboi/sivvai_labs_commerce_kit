/**
 * app/page.tsx
 *
 * Root home page — placeholder for Step 1.
 *
 * This page confirms the engineering foundation is wired correctly.
 * It imports from every major foundation layer so TypeScript validates
 * all paths at once during `tsc --noEmit`.
 *
 * Replace the entire body of this component in Step 2 when you build
 * the actual storefront home page.
 */

import { siteConfig } from "@/config/site";
import { featureFlag } from "@/config/feature-flags";
import { localizationConfig } from "@/config/localization";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/lib/utils/format";

export default function HomePage() {
  // Smoke-test: format a price using the configured currency.
  // This proves the localization config and format utility are wired.
  const samplePrice = formatCurrency(0, localizationConfig.currency);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8 text-center">
      {/* Foundation check banner */}
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-full bg-[var(--kit-accent)] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--kit-accent-fg)]">
          Step 1 — Foundation
        </div>

        <h1 className="text-4xl font-bold tracking-tight">
          {siteConfig.name}
        </h1>

        <p className="max-w-md text-[var(--kit-muted-fg)]">
          {siteConfig.tagline}
        </p>
      </div>

      {/* Foundation status grid */}
      <div className="mt-4 grid w-full max-w-lg gap-3 rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-surface)] p-6 text-left shadow-[var(--kit-shadow-card)]">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--kit-muted-fg)]">
          Foundation Status
        </h2>

        <FoundationRow label="Config system" status="ok" detail={siteConfig.url} />
        <FoundationRow label="Localization" status="ok" detail={`${localizationConfig.defaultLocale} · ${localizationConfig.currency} · ${samplePrice}`} />
        <FoundationRow label="Route constants" status="ok" detail={ROUTES.api.health} />
        <FoundationRow label="Feature flags" status="ok" detail={`auth=${featureFlag.auth} · cart=${featureFlag.cart}`} />
        <FoundationRow label="Health endpoint" status="ok" detail="GET /api/health" />
        <FoundationRow label="Type system" status="ok" detail="database.types.ts · environment.d.ts" />
        <FoundationRow label="Error classes" status="ok" detail="AppError · NotFoundError · ValidationError" />
        <FoundationRow label="Supabase clients" status="pending" detail="Install @supabase/ssr to activate" />
      </div>

      {/* Links */}
      <p className="text-xs text-[var(--kit-muted-fg)]">
        Step 2 will replace this page with the actual storefront.
      </p>
    </main>
  );
}

/* --------------------------------------------------------------------------
   Sub-components (private to this file — not exported)
-------------------------------------------------------------------------- */

function FoundationRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: "ok" | "pending" | "error";
  detail: string;
}) {
  const icon = status === "ok" ? "✓" : status === "pending" ? "◌" : "✗";
  const iconColor =
    status === "ok"
      ? "text-[var(--kit-success)]"
      : status === "pending"
        ? "text-[var(--kit-warning)]"
        : "text-[var(--kit-error)]";

  return (
    <div className="flex items-start gap-3">
      <span className={`mt-px shrink-0 text-sm font-bold ${iconColor}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <span className="text-sm font-medium">{label}</span>
        <p className="truncate text-xs text-[var(--kit-muted-fg)]">{detail}</p>
      </div>
    </div>
  );
}
