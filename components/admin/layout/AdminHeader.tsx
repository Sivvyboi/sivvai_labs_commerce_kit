"use client";

/**
 * components/admin/layout/AdminHeader.tsx
 *
 * Top bar for the admin shell.
 * Client Component — needs usePathname for breadcrumbs + mobile menu trigger.
 *
 * Slots:
 *  - Left: Mobile menu button (lg:hidden) + Page title / Breadcrumbs
 *  - Right: Quick-action icon buttons (placeholder slots)
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronRight, Bell } from "lucide-react";
import { clsx } from "clsx";

interface AdminHeaderProps {
  onMenuOpen: () => void;
}

// Derive breadcrumb label from a URL segment
function segmentLabel(segment: string): string {
  if (!segment) return "Dashboard";
  // Map known segments to display names
  const labels: Record<string, string> = {
    admin: "Admin",
    products: "Products",
    categories: "Categories",
    inventory: "Inventory",
    orders: "Orders",
    customers: "Customers",
    promotions: "Promotions",
    settings: "Settings",
    activity: "Activity",
    new: "New",
    team: "Team",
    members: "Members",
    invitations: "Invitations",
    users: "Users",
    forbidden: "Access Restricted",
  };
  return labels[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

function Breadcrumbs() {
  const pathname = usePathname();
  // Split pathname into segments, filter empty strings
  const segments = pathname.split("/").filter(Boolean);

  // Build crumb pairs: [label, href]
  const crumbs = segments.map((seg, idx) => ({
    label: segmentLabel(seg),
    href: "/" + segments.slice(0, idx + 1).join("/"),
    isLast: idx === segments.length - 1,
    // Don't show UUIDs as labels — show "Detail" instead
    isId: /^[0-9a-f-]{36}$/i.test(seg),
  }));

  // Skip the "Admin" root crumb if we're on the dashboard itself
  const displayCrumbs = crumbs.length === 1 && crumbs[0].label === "Admin" ? [] : crumbs;

  // Page title is the last meaningful segment
  const pageTitle = (() => {
    const last = [...crumbs].reverse().find((c) => !c.isId);
    return last?.label ?? "Dashboard";
  })();

  return (
    <div>
      <h1 className="text-base font-semibold text-[var(--kit-text-primary)]">{pageTitle}</h1>
      {displayCrumbs.length > 1 && (
        <nav aria-label="Breadcrumb" className="mt-0.5 flex items-center gap-1">
          {displayCrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href}>
              {idx > 0 && <ChevronRight size={12} className="text-[var(--kit-text-muted)]" />}
              {crumb.isLast ? (
                <span className="text-xs text-[var(--kit-text-muted)]" aria-current="page">
                  {crumb.isId ? "Detail" : crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-xs text-[var(--kit-text-secondary)] hover:text-[var(--kit-text-primary)] transition-colors"
                >
                  {crumb.isId ? "Detail" : crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
    </div>
  );
}

export function AdminHeader({ onMenuOpen }: AdminHeaderProps) {
  return (
    <header
      className={clsx(
        "flex h-14 flex-shrink-0 items-center justify-between gap-4",
        "border-b border-[var(--kit-border)] bg-[var(--kit-surface)] px-4"
      )}
    >
      {/* Left — Mobile menu + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuOpen}
          aria-label="Open navigation menu"
          className={clsx(
            "flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)]",
            "text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)]",
            "transition-colors lg:hidden"
          )}
        >
          <Menu size={18} />
        </button>

        <Breadcrumbs />
      </div>

      {/* Right — Action icons */}
      <div className="flex items-center gap-1">
        {/* Notification bell — placeholder for future batch */}
        <button
          type="button"
          aria-label="Notifications"
          className={clsx(
            "flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)]",
            "text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)]",
            "transition-colors"
          )}
        >
          <Bell size={16} />
        </button>
      </div>
    </header>
  );
}
