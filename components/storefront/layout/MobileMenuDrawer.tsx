"use client";

/**
 * components/storefront/layout/MobileMenuDrawer.tsx
 *
 * Client Component. Mobile slide-in menu drawer from the left.
 * Provides accessible keyboard navigation (Escape to close) and backdrop lock.
 */

import * as React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { storefrontNav } from "@/config/storefront";
import { X, MessageCircle, Mail, Phone, ChevronRight } from "lucide-react";

export interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenuDrawer({ isOpen, onClose }: MobileMenuDrawerProps) {
  // Handle ESC key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const contact = siteConfig.contact;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Panel from Left */}
      <div className="relative flex w-full max-w-xs flex-col bg-[var(--kit-bg)] shadow-xl transition-transform animate-in slide-in-from-left duration-300 z-10 border-r border-[var(--kit-border)]">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-[var(--kit-border)] px-4">
          <Link
            href="/"
            onClick={onClose}
            className="text-base font-bold tracking-tight text-[var(--kit-text-primary)]"
          >
            {siteConfig.name}
          </Link>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--kit-text-secondary)] hover:bg-[var(--kit-surface)] hover:text-[var(--kit-text-primary)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <nav className="space-y-1">
            {storefrontNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className="flex items-center justify-between py-3 px-3 rounded-lg text-sm font-medium text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors"
              >
                <span>{link.label}</span>
                <ChevronRight className="h-4 w-4 text-[var(--kit-muted-fg)]" />
              </Link>
            ))}
          </nav>

          <hr className="border-[var(--kit-border)]" />

          {/* Quick Contact Options */}
          <div className="space-y-3 px-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--kit-muted-fg)]">
              Need Help?
            </p>
            <div className="space-y-2 text-xs">
              {contact.whatsapp && (
                <a
                  href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-2 text-[var(--kit-text-secondary)] hover:text-[var(--kit-text-primary)] transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-[var(--kit-accent)] shrink-0" />
                  <span>WhatsApp: {contact.whatsapp}</span>
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 py-2 text-[var(--kit-text-secondary)] hover:text-[var(--kit-text-primary)] transition-colors"
                >
                  <Mail className="h-4 w-4 text-[var(--kit-accent)] shrink-0" />
                  <span>{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-3 py-2 text-[var(--kit-text-secondary)] hover:text-[var(--kit-text-primary)] transition-colors"
                >
                  <Phone className="h-4 w-4 text-[var(--kit-accent)] shrink-0" />
                  <span>{contact.phone}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--kit-border)] p-4 text-center text-xs text-[var(--kit-muted-fg)]">
          {siteConfig.tagline}
        </div>
      </div>
    </div>
  );
}
