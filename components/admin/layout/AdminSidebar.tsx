"use client";

/**
 * components/admin/layout/AdminSidebar.tsx
 *
 * Desktop persistent sidebar for the admin shell.
 * Client Component — receives user permissions prop to render filtered nav.
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { logoutAction } from "@/lib/auth/admin-auth";
import { NAV_GROUPS, filterNavGroups, type NavItem } from "../navigation";
import { LayoutDashboard, ChevronRight, LogOut } from "lucide-react";

interface AdminSidebarProps {
  permissions?: string[];
}

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

export function AdminSidebar({ permissions = [] }: AdminSidebarProps) {
  const visibleGroups = filterNavGroups(NAV_GROUPS, permissions);

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
        {visibleGroups.map((group) => (
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
