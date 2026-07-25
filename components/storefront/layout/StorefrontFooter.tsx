/**
 * components/storefront/layout/StorefrontFooter.tsx
 *
 * Server Component. Config-driven storefront footer.
 *
 * Sources data exclusively from:
 *  - config/site.ts (site identity, brand name, contact details)
 *  - config/storefront.ts (footer columns)
 */

import Link from "next/link";
import { siteConfig } from "@/config/site";
import { footerColumns } from "@/config/storefront";
import { Phone, Mail, MessageCircle } from "lucide-react";

export function StorefrontFooter() {
  const currentYear = new Date().getFullYear();

  // Social links constructed dynamically from siteConfig.contact
  const contact = siteConfig.contact;

  return (
    <footer className="w-full border-t border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-text-secondary)]">
      <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Identity & Contact Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-[var(--kit-text-primary)] hover:opacity-90 transition-opacity"
            >
              {siteConfig.name}
            </Link>

            <p className="max-w-sm text-sm text-[var(--kit-muted-fg)] leading-relaxed">
              {siteConfig.tagline}
            </p>

            {/* Direct Contact Links */}
            <div className="space-y-2 text-xs">
              {contact.whatsapp && (
                <a
                  href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[var(--kit-text-primary)] transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-[var(--kit-accent)] shrink-0" />
                  <span>WhatsApp: {contact.whatsapp}</span>
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 hover:text-[var(--kit-text-primary)] transition-colors"
                >
                  <Mail className="h-4 w-4 text-[var(--kit-accent)] shrink-0" />
                  <span>{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 hover:text-[var(--kit-text-primary)] transition-colors"
                >
                  <Phone className="h-4 w-4 text-[var(--kit-accent)] shrink-0" />
                  <span>{contact.phone}</span>
                </a>
              )}
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              {contact.instagram && (
                <a
                  href={`https://instagram.com/${contact.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--kit-card)] border border-[var(--kit-border)] text-[var(--kit-text-secondary)] hover:text-[var(--kit-accent)] hover:border-[var(--kit-accent)] transition-colors"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Configured Link Columns */}
          {footerColumns.map((col) => (
            <div key={col.heading} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--kit-text-primary)]">
                {col.heading}
              </h3>
              <ul className="space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[var(--kit-text-primary)] transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="hover:text-[var(--kit-text-primary)] transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar / Copyright */}
        <div className="mt-12 border-t border-[var(--kit-border)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--kit-muted-fg)]">
          <p>© {currentYear} {siteConfig.name}. All rights reserved.</p>
          <p className="text-[11px] opacity-75">
            Powered by Sivvai Labs Commerce Kit
          </p>
        </div>
      </div>
    </footer>
  );
}
