/**
 * components/admin/dashboard/QuickActions.tsx
 *
 * Quick shortcut buttons for common admin tasks.
 * Server Component.
 */

import * as React from "react";
import Link from "next/link";
import { Plus, ShoppingBag, Users, Tag } from "lucide-react";
import { clsx } from "clsx";

const ACTIONS = [
  {
    id: "new-product",
    label: "New Product",
    description: "Add a product to your catalog",
    href: "/admin/products/new",
    icon: Plus,
    accent: "text-[var(--kit-accent)] bg-[var(--kit-accent)]/10",
  },
  {
    id: "view-orders",
    label: "View Orders",
    description: "Manage incoming orders",
    href: "/admin/orders",
    icon: ShoppingBag,
    accent: "text-[var(--kit-info)] bg-[var(--kit-info)]/10",
  },
  {
    id: "view-customers",
    label: "Customers",
    description: "Browse your customer list",
    href: "/admin/customers",
    icon: Users,
    accent: "text-[var(--kit-success)] bg-[var(--kit-success)]/10",
  },
  {
    id: "new-promotion",
    label: "New Promotion",
    description: "Create a discount or coupon",
    href: "/admin/promotions",
    icon: Tag,
    accent: "text-[var(--kit-warning)] bg-[var(--kit-warning)]/10",
  },
] as const;

export function QuickActions() {
  return (
    <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-[var(--kit-shadow-sm)]">
      <div className="border-b border-[var(--kit-border)] px-5 py-4">
        <p className="text-sm font-medium text-[var(--kit-text-primary)]">Quick Actions</p>
      </div>
      <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-[var(--kit-border)]">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              id={`quick-action-${action.id}`}
              href={action.href}
              className={clsx(
                "flex flex-col gap-2 p-4 transition-colors hover:bg-[var(--kit-muted)]"
              )}
            >
              <span className={clsx("flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)]", action.accent)}>
                <Icon size={16} />
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--kit-text-primary)]">{action.label}</p>
                <p className="text-xs text-[var(--kit-text-muted)]">{action.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
