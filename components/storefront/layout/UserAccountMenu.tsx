"use client";

/**
 * components/storefront/layout/UserAccountMenu.tsx
 *
 * Client Component. Interactive User Account Menu in Storefront Header.
 * Renders:
 *  - Unauthenticated: "Sign In" button + Dropdown with "Sign In", "Create Account", "Track Order"
 *  - Authenticated: Avatar badge + Dropdown with "My Account", "My Orders", "Saved Addresses", "Sign Out"
 */

import * as React from "react";
import Link from "next/link";
import { useCustomerAuth } from "@/features/storefront/hooks/useCustomerAuth";
import { ROUTES } from "@/constants/routes";
import {
  User,
  ShoppingBag,
  MapPin,
  LogOut,
  LogIn,
  UserPlus,
  Search,
  ChevronDown,
  Loader2,
} from "lucide-react";

export function UserAccountMenu() {
  const { user, isAuthenticated, isLoading, signOut } = useCustomerAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on ESC
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      setIsOpen(false);
    } finally {
      setIsSigningOut(false);
    }
  }

  const firstName =
    (user?.user_metadata?.first_name as string) ||
    (user?.user_metadata?.given_name as string) ||
    (user?.user_metadata?.name as string) ||
    "";

  const userDisplayName = firstName || (user?.email ? user.email.split("@")[0] : "Customer");
  const userInitials = (firstName ? firstName[0] : user?.email ? user.email[0] : "U").toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <div className="flex items-center gap-1.5">
        {/* Visible Desktop "Sign In" button when unauthenticated */}
        {!isLoading && !isAuthenticated && (
          <Link
            href={ROUTES.auth.signIn}
            className="hidden md:inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] border border-[var(--kit-border)] transition-all min-h-[36px]"
          >
            <LogIn className="h-3.5 w-3.5 mr-1.5 text-[var(--kit-accent)]" />
            <span>Sign In</span>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={isAuthenticated ? `Account menu for ${userDisplayName}` : "Customer account menu"}
          className="flex h-10 items-center gap-1.5 px-2 rounded-lg text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors min-h-[44px]"
        >
          {isAuthenticated ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] text-xs font-bold shadow-xs">
              {userInitials}
            </div>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--kit-surface)] text-[var(--kit-text-secondary)] border border-[var(--kit-border)]">
              <User className="h-4 w-4" />
            </div>
          )}
          <ChevronDown className="h-3 w-3 text-[var(--kit-muted-fg)] transition-transform duration-150" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-2 shadow-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
          {isAuthenticated ? (
            /* --- Authenticated Menu --- */
            <div>
              <div className="px-3 py-2.5 border-b border-[var(--kit-border)] mb-1">
                <p className="font-bold text-sm text-[var(--kit-text-primary)] truncate">
                  {userDisplayName}
                </p>
                <p className="text-[11px] text-[var(--kit-muted-fg)] truncate">
                  {user?.email}
                </p>
              </div>

              <div className="space-y-0.5">
                <Link
                  href="/account"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors"
                >
                  <User className="h-4 w-4 text-[var(--kit-accent)]" />
                  <span>My Account</span>
                </Link>

                <Link
                  href="/account/orders"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors"
                >
                  <ShoppingBag className="h-4 w-4 text-[var(--kit-accent)]" />
                  <span>My Orders</span>
                </Link>

                <Link
                  href="/account/addresses"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors"
                >
                  <MapPin className="h-4 w-4 text-[var(--kit-accent)]" />
                  <span>Saved Addresses</span>
                </Link>
              </div>

              <div className="border-t border-[var(--kit-border)] mt-1.5 pt-1.5">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 text-left"
                >
                  {isSigningOut ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <LogOut className="h-4 w-4 shrink-0" />
                  )}
                  <span>{isSigningOut ? "Signing out…" : "Sign Out"}</span>
                </button>
              </div>
            </div>
          ) : (
            /* --- Unauthenticated Menu --- */
            <div>
              <div className="px-3 py-2 mb-1.5">
                <p className="font-bold text-[var(--kit-text-primary)]">Welcome</p>
                <p className="text-[11px] text-[var(--kit-muted-fg)]">
                  Sign in to access your orders & saved details.
                </p>
              </div>

              <div className="space-y-1">
                <Link
                  href={ROUTES.auth.signIn}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg font-semibold bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] hover:opacity-90 shadow-sm transition-opacity text-center min-h-[38px]"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </Link>

                <Link
                  href={ROUTES.auth.signUp}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg font-medium border border-[var(--kit-border)] text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors text-center min-h-[36px]"
                >
                  <UserPlus className="h-4 w-4 text-[var(--kit-muted-fg)]" />
                  <span>Create Account</span>
                </Link>
              </div>

              <div className="border-t border-[var(--kit-border)] mt-2 pt-2">
                <Link
                  href="/orders/lookup"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-[var(--kit-muted-fg)] hover:text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors"
                >
                  <Search className="h-4 w-4" />
                  <span>Track Guest Order</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
