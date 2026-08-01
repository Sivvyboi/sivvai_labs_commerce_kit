"use client";

/**
 * components/admin/layout/AdminSidebar.tsx
 *
 * Desktop persistent sidebar for the admin shell.
 * Client Component — needs usePathname for active link detection.
 *
 * Navigation groups:
 *  - Overview
 *  - Catalog (Products, Categories, Inventory)
 *  - Operations (Orders)
 *  - Customers
 *  - Marketing (Promotions)
 *  - Activity
 *  - Settings
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { logoutAction } from "@/lib/auth/admin-auth";
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  Warehouse,
  ShoppingBag,
  Users,
  Tag,
  Settings,
  Activity,
  ChevronRight,
  LogOut,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products",   href: "/admin/products",   icon: Package },
      { label: "Categories", href: "/admin/categories", icon: FolderOpen },
      { label: "Inventory",  href: "/admin/inventory",  icon: Warehouse },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Orders",    href: "/admin/orders",    icon: ShoppingBag },
      { label: "Customers", href: "/admin/customers", icon: Users },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Promotions", href: "/admin/promotions", icon: Tag },
    ],
  },
  {
    label: "Store",
    items: [
      { label: "Activity", href: "/admin/activity", icon: Activity },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={clsx(
        "group flex items-center gap-2.5 rounded-[var(--kit-radius-md)] px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-[var(--kit-accent)]/10 text-[var(--kit-accent)]"
          : "text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)]"
      )}
    >
      <Icon
        size={16}
        className={clsx(
          "flex-shrink-0 transition-colors",
          isActive ? "text-[var(--kit-accent)]" : "text-[var(--kit-text-muted)] group-hover:text-[var(--kit-text-primary)]"
        )}
      />
      {item.label}
      {isActive && (
        <ChevronRight size={12} className="ml-auto text-[var(--kit-accent)]" />
      )}
    </Link>
  );
}

export function AdminSidebar() {
  return (
    <aside
      id="admin-sidebar"
      className={clsx(
        "hidden lg:flex",
        "w-56 flex-shrink-0 flex-col",
        "border-r border-[var(--kit-border)] bg-[var(--kit-surface)]",
        "h-full overflow-y-auto"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-14 flex-shrink-0 items-center border-b border-[var(--kit-border)] px-4">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] text-white">
            <LayoutDashboard size={14} />
          </span>
          <span className="text-sm font-semibold text-[var(--kit-text-primary)]">Admin Console</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 p-3 pt-4" aria-label="Admin navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--kit-text-muted)]">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — back to storefront & sign out */}
      <div className="border-t border-[var(--kit-border)] p-3 space-y-1">
        <Link
          href="/"
          className={clsx(
            "flex items-center gap-2.5 rounded-[var(--kit-radius-md)] px-3 py-2 text-xs",
            "text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
          )}
        >
          ← Back to Storefront
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className={clsx(
              "w-full flex items-center gap-2.5 rounded-[var(--kit-radius-md)] px-3 py-2 text-xs font-medium",
              "text-[var(--kit-danger)] hover:bg-[var(--kit-danger)]/10 transition-colors"
            )}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
