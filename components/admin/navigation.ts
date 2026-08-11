import type { ComponentType } from "react";
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
  UserCheck,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
  permission?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: Package, permission: "manage_products" },
      { label: "Categories", href: "/admin/categories", icon: FolderOpen, permission: "manage_categories" },
      { label: "Inventory", href: "/admin/inventory", icon: Warehouse, permission: "manage_inventory" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingBag, permission: "view_orders" },
      { label: "Customers", href: "/admin/customers", icon: Users, permission: "view_customers" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Promotions", href: "/admin/promotions", icon: Tag, permission: "manage_promotions" },
    ],
  },
  {
    label: "Store",
    items: [
      { label: "Activity", href: "/admin/activity", icon: Activity, permission: "view_activity" },
      { label: "Team", href: "/admin/team", icon: UserCheck, permission: "manage_users" },
      { label: "Settings", href: "/admin/settings", icon: Settings, permission: "manage_settings" },
    ],
  },
];

/**
 * Filters navigation groups and items based on the user's granted permissions.
 */
export function filterNavGroups(groups: NavGroup[], permissions: string[]): NavGroup[] {
  return groups
    .map((group) => {
      const filteredItems = group.items.filter((item) => {
        if (!item.permission) return true;
        if (permissions.includes(item.permission)) return true;
        // Permissive read mapping for view_ vs manage_
        if (item.permission === "view_orders" && permissions.includes("manage_orders")) return true;
        if (item.permission === "view_customers" && permissions.includes("manage_customers")) return true;
        return false;
      });

      return {
        ...group,
        items: filteredItems,
      };
    })
    .filter((group) => group.items.length > 0);
}
