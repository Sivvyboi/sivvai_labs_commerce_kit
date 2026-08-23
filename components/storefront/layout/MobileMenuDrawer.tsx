"use client";

/**
 * components/storefront/layout/MobileMenuDrawer.tsx
 *
 * Client Component. Mobile slide-in menu drawer from the left.
 * Provides accessible keyboard navigation (Escape to close) and backdrop lock.
 * Includes auth-aware account section: Sign In / Create Account for guests,
 * My Account / Sign Out for authenticated customers.
 */

import * as React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { storefrontNav } from "@/config/storefront";
import { useCustomerAuth } from "@/features/storefront/hooks/useCustomerAuth";
import { ROUTES } from "@/constants/routes";
import {
  X,
  MessageCircle,
  Mail,
  Phone,
  ChevronRight,
  User,
  ShoppingBag,
  MapPin,
  LogIn,
  UserPlus,
  LogOut,
  Loader2,
} from "lucide-react";

export interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenuDrawer({ isOpen, onClose }: MobileMenuDrawerProps) {
  const { user, isAuthenticated, isLoading, signOut } = useCustomerAuth();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

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

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      onClose();
    } finally {
      setIsSigningOut(false);
    }
  }

  if (!isOpen) return null;

  const contact = siteConfig.contact;
  const firstName =
    (user?.user_metadata?.first_name as string) ||
    (user?.user_metadata?.given_name as string) ||
    (user?.user_metadata?.name as string) ||
    "";
  const displayName = firstName || (user?.email ? user.email.split("@")[0] : "Customer");
  const userInitials = (firstName ? firstName[0] : user?.email ? user.email[0] : "U").toUpperCase();

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

        {/* Account Section */}
        <div className="border-b border-[var(--kit-border)] px-4 py-4">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[var(--kit-surface)] animate-pulse" />
              <div className="h-4 w-24 rounded bg-[var(--kit-surface)] animate-pulse" />
            </div>
          ) : isAuthenticated ? (
            /* Authenticated account row */
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] text-sm font-bold">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--kit-text-primary)] truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-[var(--kit-muted-fg)] truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/account"
                  onClick={onClose}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border border-[var(--kit-border)] text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors min-h-[36px]"
                >
                  <User className="h-3.5 w-3.5 text-[var(--kit-accent)]" />
                  My Account
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border border-[var(--kit-border)] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors min-h-[36px] disabled:opacity-50"
                >
                  {isSigningOut ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                  {isSigningOut ? "Signing out…" : "Sign Out"}
                </button>
              </div>
            </div>
          ) : (
            /* Guest auth section */
            <div className="space-y-2">
              <p className="text-xs text-[var(--kit-muted-fg)]">
                Sign in to track orders & save details.
              </p>
              <div className="flex gap-2">
                <Link
                  href={ROUTES.auth.signIn}
                  onClick={onClose}
                  className="flex flex-1 items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[36px]"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Link>
                <Link
                  href={ROUTES.auth.signUp}
                  onClick={onClose}
                  className="flex flex-1 items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border border-[var(--kit-border)] text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors min-h-[36px]"
                >
                  <UserPlus className="h-3.5 w-3.5 text-[var(--kit-muted-fg)]" />
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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

            {/* Account-specific nav links (shown only when authenticated) */}
            {isAuthenticated && (
              <>
                <Link
                  href="/account/orders"
                  onClick={onClose}
                  className="flex items-center justify-between py-3 px-3 rounded-lg text-sm font-medium text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-[var(--kit-accent)]" />
                    My Orders
                  </span>
                  <ChevronRight className="h-4 w-4 text-[var(--kit-muted-fg)]" />
                </Link>
                <Link
                  href="/account/addresses"
                  onClick={onClose}
                  className="flex items-center justify-between py-3 px-3 rounded-lg text-sm font-medium text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[var(--kit-accent)]" />
                    My Addresses
                  </span>
                  <ChevronRight className="h-4 w-4 text-[var(--kit-muted-fg)]" />
                </Link>
              </>
            )}
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
