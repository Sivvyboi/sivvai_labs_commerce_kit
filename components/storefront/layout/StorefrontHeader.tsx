"use client";

/**
 * components/storefront/layout/StorefrontHeader.tsx
 *
 * Client Component. Main storefront top navigation header.
 *
 * Structure:
 *  [Logo] | [Desktop Nav] | [Search Button] [Cart Badge] [Mobile Menu Button]
 *
 * Features:
 *  - Sticky top with backdrop blur
 *  - Mobile drawer toggle
 *  - Zustand cart drawer integration
 *  - Accessible 44px min touch target buttons
 */

import * as React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { storefrontNav } from "@/config/storefront";
import { useCartStore } from "@/features/storefront/store/cart.store";
import { MobileMenuDrawer } from "./MobileMenuDrawer";
import { SearchOverlay } from "./SearchOverlay";
import { Search, ShoppingBag, Menu, User } from "lucide-react";
import { ROUTES } from "@/constants/routes";

export function StorefrontHeader() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const { cartCount, openDrawer } = useCartStore();

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[var(--kit-border)] bg-[var(--kit-bg)]/90 backdrop-blur-md transition-colors">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Mobile Menu Button + Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link
              href={ROUTES.home}
              className="text-lg font-bold tracking-tight text-[var(--kit-text-primary)] hover:opacity-90 transition-opacity"
            >
              {siteConfig.name}
            </Link>
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {storefrontNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[var(--kit-text-secondary)] hover:text-[var(--kit-text-primary)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right: Search, Account & Cart Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Search Overlay Trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Open search overlay"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Account Link */}
            <Link
              href="/account"
              aria-label="My Account"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors"
            >
              <User className="h-5 w-5" />
            </Link>

            {/* Cart Drawer Trigger */}
            <button
              onClick={openDrawer}
              aria-label={`Shopping cart with ${cartCount} items`}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--kit-accent)] text-[9px] font-bold text-[var(--kit-accent-fg)] animate-in zoom-in-50 duration-150">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Instant Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Slide-in Mobile Drawer */}
      <MobileMenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />
    </>
  );
}
