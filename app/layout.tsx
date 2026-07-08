/**
 * app/layout.tsx
 *
 * Root layout — wraps every page in the application.
 *
 * Responsibilities:
 * - Sets the <html> lang and dir attributes from localization config
 * - Loads and applies the Geist font family
 * - Exports the base metadata (extended per-page via generateMetadata)
 * - Exports the viewport configuration
 * - Provides a shell for future global client providers
 *
 * This is a Server Component (default). It must NOT be marked 'use client'.
 * Interactive providers are imported as Client Components and nested inside.
 *
 * Reference:
 * → node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md
 * → node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { defaultMetadata } from "@/config/seo";
import { HTML_LANG, HTML_DIR } from "@/constants/metadata";

/* --------------------------------------------------------------------------
   Font configuration
   Geist is Vercel's design system font — clean, neutral, professional.
   Variables are injected as CSS custom properties consumed in globals.css.
-------------------------------------------------------------------------- */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/* --------------------------------------------------------------------------
   Metadata
   Exported at this level so Next.js can merge it with per-page metadata.
   Individual pages override fields via their own `export const metadata`
   or `export async function generateMetadata`.
-------------------------------------------------------------------------- */

export const metadata: Metadata = defaultMetadata;

/* --------------------------------------------------------------------------
   Viewport
   Exported separately (Next.js 15+ best practice — not inside metadata).
   viewport-fit=cover ensures content extends under notches on iOS.
-------------------------------------------------------------------------- */

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

/* --------------------------------------------------------------------------
   Root Layout Component
-------------------------------------------------------------------------- */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={HTML_LANG}
      dir={HTML_DIR}
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {/*
          TODO (Step 2): Wrap children in global providers here.
          Pattern: import ThemeProvider from "@/components/providers/ThemeProvider"
          Keep providers as shallow Client Component wrappers — pass children as props.
          Never mark this layout 'use client'.
        */}
        {children}
      </body>
    </html>
  );
}
