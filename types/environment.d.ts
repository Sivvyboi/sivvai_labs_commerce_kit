/**
 * types/environment.d.ts
 *
 * Augments the global `NodeJS.ProcessEnv` interface so that every
 * `process.env.SOME_KEY` access is type-checked across the entire project.
 *
 * Rules:
 * - Public vars (safe for the browser): prefix NEXT_PUBLIC_*
 * - Private vars (server-only): no prefix — Next.js strips them from the
 *   client bundle automatically.
 * - All values are `string | undefined` unless a default is set in code.
 *   Never assert `!` on env vars; check before use or provide a fallback.
 *
 * Keep this file in sync with .env.example.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    // ------------------------------------------------------------------
    // Next.js built-in
    // ------------------------------------------------------------------
    NODE_ENV: "development" | "production" | "test";
    NEXT_RUNTIME?: "nodejs" | "edge";

    // ------------------------------------------------------------------
    // Site identity (public)
    // ------------------------------------------------------------------
    /** Canonical origin URL, e.g. "https://mystore.com" */
    NEXT_PUBLIC_SITE_URL?: string;
    /** Merchant contact email, displayed in footer/support */
    NEXT_PUBLIC_CONTACT_EMAIL?: string;
    /** Merchant contact phone number */
    NEXT_PUBLIC_CONTACT_PHONE?: string;
    /** WhatsApp number in international format, e.g. "+2348012345678" */
    NEXT_PUBLIC_WHATSAPP_NUMBER?: string;
    /** Instagram handle without @ */
    NEXT_PUBLIC_INSTAGRAM_HANDLE?: string;

    // ------------------------------------------------------------------
    // Supabase — public (browser-safe, required by createBrowserClient)
    // ------------------------------------------------------------------
    /** Supabase project URL, e.g. "https://<ref>.supabase.co" */
    NEXT_PUBLIC_SUPABASE_URL?: string;
    /** Supabase anon key — intentionally public, safe to ship to browser */
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;

    // ------------------------------------------------------------------
    // Supabase — server-only (NEVER expose to client)
    // ------------------------------------------------------------------
    /** Supabase service role key — bypasses RLS, NEVER expose to client */
    SUPABASE_SERVICE_ROLE_KEY?: string;

    // ------------------------------------------------------------------
    // Feature flags (public — read by both server and client)
    // ------------------------------------------------------------------
    NEXT_PUBLIC_FEATURE_AUTH?: string;
    NEXT_PUBLIC_FEATURE_CART?: string;
    NEXT_PUBLIC_FEATURE_SEARCH?: string;
    NEXT_PUBLIC_FEATURE_REVIEWS?: string;
    NEXT_PUBLIC_FEATURE_WISHLIST?: string;
    NEXT_PUBLIC_FEATURE_WHATSAPP_CHECKOUT?: string;

    // ------------------------------------------------------------------
    // Email / Transactional Notifications (Server-only)
    // ------------------------------------------------------------------
    /** Active email provider: "resend" | "mock" (defaults to "resend") */
    EMAIL_PROVIDER?: string;
    /** Resend API Key (starts with re_) */
    RESEND_API_KEY?: string;
    /** Sender email address / name, e.g. "Store <orders@example.com>" */
    EMAIL_FROM?: string;
  }
}
