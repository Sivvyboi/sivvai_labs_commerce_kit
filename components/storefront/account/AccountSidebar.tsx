"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { signOutAction } from "@/features/storefront/actions/account.actions";
import { useCustomerAuth } from "@/features/storefront/hooks/useCustomerAuth";
import { ROUTES } from "@/constants/routes";
import {
  LayoutDashboard,
  ShoppingBag,
  User,
  MapPin,
  Search,
  LogOut,
  LogIn,
  Loader2,
} from "lucide-react";

export function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useCustomerAuth();
  const [isPending, startTransition] = React.useTransition();

  const firstName =
    (user?.user_metadata?.first_name as string) ||
    (user?.user_metadata?.given_name as string) ||
    (user?.user_metadata?.name as string) ||
    "";
  const displayName = firstName || (user?.email ? user.email.split("@")[0] : "Customer");
  const userInitials = (firstName ? firstName[0] : user?.email ? user.email[0] : "U").toUpperCase();

  const navItems = [
    { label: "Overview", href: "/account", icon: LayoutDashboard },
    { label: "Orders", href: "/account/orders", icon: ShoppingBag },
    { label: "Profile", href: "/account/profile", icon: User },
    { label: "Addresses", href: "/account/addresses", icon: MapPin },
    { label: "Order Lookup", href: "/orders/lookup", icon: Search },
  ];

  function handleSignOut() {
    startTransition(async () => {
      await signOutAction();
      router.push(ROUTES.auth.signIn);
      router.refresh();
    });
  }

  return (
    <aside className="w-full md:w-64 shrink-0">
      <div className="flex md:flex-col gap-1 p-2 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] overflow-x-auto scrollbar-none shadow-sm">
        {/* User preview header (desktop only) */}
        {isAuthenticated && user && (
          <div className="hidden md:flex items-center gap-3 p-3 mb-1 border-b border-[var(--kit-border)]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] text-sm font-bold shadow-xs">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--kit-text-primary)] truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-[var(--kit-muted-fg)] truncate">
                {user.email}
              </p>
            </div>
          </div>
        )}

        <nav className="flex md:flex-col gap-1 w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-h-[44px]",
                isActive
                  ? "bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] shadow-sm font-semibold"
                  : "text-[var(--kit-muted-fg)] hover:text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Sign Out — only shown when authenticated */}
        {isAuthenticated && (
          <button
            onClick={handleSignOut}
            disabled={isPending}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors whitespace-nowrap min-h-[44px] mt-auto disabled:opacity-50 text-left w-full"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 shrink-0" />
            )}
            <span>{isPending ? "Signing out…" : "Sign Out"}</span>
          </button>
        )}

        {/* Sign In — shown if somehow rendered without auth */}
        {!isAuthenticated && (
          <Link
            href={ROUTES.auth.signIn}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-[var(--kit-accent)] hover:bg-[var(--kit-surface)] transition-colors whitespace-nowrap min-h-[44px] mt-auto w-full"
          >
            <LogIn className="h-4 w-4 shrink-0" />
            <span>Sign In</span>
          </Link>
        )}
        </nav>
      </div>
    </aside>
  );
}
