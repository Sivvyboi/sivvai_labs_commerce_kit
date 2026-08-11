"use client";

/**
 * components/admin/layout/AdminMobileDrawer.tsx
 *
 * Slide-in sidebar for mobile/tablet viewports.
 * Uses React Portal (document.body) to avoid parent container stacking/clipping issues.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { logoutAction } from "@/lib/auth/admin-auth";
import { NAV_GROUPS, filterNavGroups, type NavItem } from "../navigation";
import { LayoutDashboard, X, ChevronRight, LogOut } from "lucide-react";

interface AdminMobileDrawerProps {
  open: boolean;
  onClose: () => void;
  permissions?: string[];
  userEmail?: string;
  roleName?: string;
}

function NavLink({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const pathname = usePathname();
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClose}
      aria-current={isActive ? "page" : undefined}
      className={clsx(
        "group flex items-center gap-2.5 rounded-[var(--kit-radius-md)] px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-[var(--kit-accent)]/10 text-[var(--kit-accent)]"
          : "text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)]"
      )}
    >
      <Icon size={16} className="flex-shrink-0" />
      {item.label}
      {isActive && <ChevronRight size={12} className="ml-auto text-[var(--kit-accent)]" />}
    </Link>
  );
}

const emptySubscribe = () => () => {};

export function AdminMobileDrawer({
  open,
  onClose,
  permissions = [],
  userEmail = "",
  roleName = "",
}: AdminMobileDrawerProps) {
  const isClient = React.useSyncExternalStore(emptySubscribe, () => true, () => false);
  const visibleGroups = filterNavGroups(NAV_GROUPS, permissions);

  // Close on Escape key
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Lock body scroll while open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!isClient) return null;

  const content = (
    <div className="lg:hidden">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={clsx(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Drawer panel */}
      <aside
        id="admin-mobile-drawer"
        aria-label="Mobile navigation"
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col",
          "border-r border-[var(--kit-border)] bg-[var(--kit-surface)] shadow-2xl",
          "transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--kit-border)] px-4">
          <Link href="/admin" onClick={onClose} className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] text-white">
              <LayoutDashboard size={14} />
            </span>
            <span className="text-sm font-semibold text-[var(--kit-text-primary)]">Admin Console</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)]",
              "text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
            )}
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-y-auto p-3 pt-4">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--kit-text-muted)]">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} onClose={onClose} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer — user identity + actions */}
        <div className="border-t border-[var(--kit-border)] p-3 space-y-1">
          {userEmail && (
            <div className="rounded-[var(--kit-radius-md)] bg-[var(--kit-muted)]/30 px-3 py-2 mb-2">
              <p className="text-[11px] font-medium text-[var(--kit-text-primary)] truncate">{userEmail}</p>
              {roleName && <p className="text-[10px] text-[var(--kit-text-muted)]">{roleName}</p>}
            </div>
          )}
          <Link
            href="/"
            onClick={onClose}
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
    </div>
  );

  return createPortal(content, document.body);
}
