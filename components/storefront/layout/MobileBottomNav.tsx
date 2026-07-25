"use client";

/**
 * components/storefront/layout/MobileBottomNav.tsx
 *
 * Client Component. Fixed bottom navigation bar for mobile screens (hidden on md+).
 * Automatically highlights the active tab using `usePathname()`.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/features/storefront/store/cart.store";
import { Home, LayoutGrid, Search, ShoppingBag, MessageCircle } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { cartCount, openDrawer } = useCartStore();

  const navItems = [
    {
      label: "Home",
      href: ROUTES.home,
      icon: Home,
      exact: true,
    },
    {
      label: "Shop",
      href: ROUTES.catalog,
      icon: LayoutGrid,
      exact: false,
    },
    {
      label: "Search",
      href: ROUTES.search,
      icon: Search,
      exact: false,
    },
    {
      label: "Cart",
      href: ROUTES.cart,
      icon: ShoppingBag,
      exact: false,
      isCart: true,
      badge: cartCount > 0 ? cartCount : undefined,
    },
    {
      label: "Help",
      href: ROUTES.contact,
      icon: MessageCircle,
      exact: false,
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--kit-border)] bg-[var(--kit-bg)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden shadow-lg transition-transform"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && item.href !== "/";

          const IconComponent = item.icon;

          if (item.isCart) {
            return (
              <button
                key={item.label}
                onClick={openDrawer}
                aria-label={`Cart with ${cartCount} items`}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 h-full text-[10px] font-medium transition-colors min-h-[44px]",
                  isActive
                    ? "text-[var(--kit-accent)] font-semibold"
                    : "text-[var(--kit-text-secondary)] hover:text-[var(--kit-text-primary)]"
                )}
              >
                <div className="relative">
                  <IconComponent className="h-5 w-5" />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--kit-accent)] text-[9px] font-bold text-[var(--kit-accent-fg)]">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 h-full text-[10px] font-medium transition-colors min-h-[44px]",
                isActive
                  ? "text-[var(--kit-accent)] font-semibold"
                  : "text-[var(--kit-text-secondary)] hover:text-[var(--kit-text-primary)]"
              )}
            >
              <IconComponent className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
