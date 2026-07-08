/**
 * config/site.ts
 *
 * Core site identity. This is the single source of truth for brand-level
 * information: the store name, domain, contact details, and social handles.
 *
 * Keep this framework-agnostic — no Next.js imports here. Other config
 * modules and components import from this file, not the other way around.
 */

export const siteConfig = {
  /**
   * The publicly displayed name of the store.
   * Used in page titles, OG tags, emails, and receipts.
   */
  name: "Sivvai Labs Commerce Kit",

  /**
   * A short one-line description of the business.
   * Used as the default meta description fallback.
   */
  tagline: "A production-ready social commerce framework.",

  /**
   * Canonical origin URL — no trailing slash.
   * In production this must match your actual domain.
   * Override via NEXT_PUBLIC_SITE_URL env var at build time.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  /**
   * Contact details for the merchant.
   * Used in footers, order confirmation emails, and support pages.
   */
  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "",
    /** WhatsApp number in international format, e.g. "+2348012345678" */
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
    /** Instagram handle without the @ symbol */
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE ?? "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
