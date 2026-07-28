"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { featureFlag } from "@/config/feature-flags";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  ShoppingBag,
  User,
  MapPin,
  Search,
  LogOut,
} from "lucide-react";

export function AccountSidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: "/account", icon: LayoutDashboard },
    { label: "Orders", href: "/account/orders", icon: ShoppingBag },
    { label: "Profile", href: "/account/profile", icon: User },
    { label: "Addresses", href: "/account/addresses", icon: MapPin },
    { label: "Order Lookup", href: "/orders/lookup", icon: Search },
  ];

  return (
    <aside className="w-full md:w-64 shrink-0">
      <nav className="flex md:flex-col gap-1 p-2 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] overflow-x-auto scrollbar-none shadow-sm">
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

        {/* Render Logout ONLY when featureFlag.auth is enabled */}
        {featureFlag.auth && (
          <button
            onClick={() => {
              // Trigger sign-out action when auth is active
              window.location.href = "/api/auth/signout";
            }}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors whitespace-nowrap min-h-[44px] mt-auto"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        )}
      </nav>
    </aside>
  );
}
