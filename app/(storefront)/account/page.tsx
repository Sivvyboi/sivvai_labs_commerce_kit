import Link from "next/link";
import { getCurrentUser, getOrCreateCustomer } from "@/lib/auth/server-auth";
import * as orderRepo from "@/lib/db/orders";
import { Price } from "@/components/shared/Price";
import { koboToNaira } from "@/lib/utils/money";
import {
  ShoppingBag,
  Clock,
  PackageCheck,
  MapPin,
  ChevronRight,
  User,
  Phone,
  Mail,
  CalendarDays,
  Grid3x3,
  Search,
  ArrowRight,
} from "lucide-react";

export const revalidate = 0;

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
    case "delivered":
      return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50";
    case "processing":
    case "shipped":
      return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50";
    case "cancelled":
    case "refunded":
      return "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50";
    default:
      return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50";
  }
}

export default async function AccountOverviewPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout redirects, this is a safety guard

  const customer = await getOrCreateCustomer(user);
  const orders = await orderRepo.findCustomerOrders(customer.id).catch(() => []);
  const addresses = customer.addresses || [];

  const totalOrders = orders.length;
  const activeOrders = orders.filter((o) =>
    ["pending", "processing", "shipped"].includes(o.status.toLowerCase())
  ).length;
  const completedOrders = orders.filter((o) =>
    ["completed", "delivered"].includes(o.status.toLowerCase())
  ).length;
  const addressCount = addresses.length;

  const recentOrders = orders.slice(0, 3);
  const defaultAddress = addresses.find((a) => a.is_default) || addresses[0];

  const fullName = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ") || "Valued Customer";
  const initials = [customer.first_name?.[0], customer.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  const memberSince = new Date(customer.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      {/* ── Hero / Profile Strip ── */}
      <div className="p-6 rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-sm overflow-hidden relative">
        {/* Background accent glow */}
        <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-[var(--kit-accent)]/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="h-14 w-14 rounded-full bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] flex items-center justify-center font-black text-lg shadow-md shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-black text-[var(--kit-text-primary)] leading-tight">
                Welcome back, {customer.first_name || "there"}!
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span className="flex items-center gap-1 text-xs text-[var(--kit-muted-fg)]">
                  <Mail className="h-3.5 w-3.5" />
                  {customer.email}
                </span>
                {customer.phone && (
                  <span className="flex items-center gap-1 text-xs text-[var(--kit-muted-fg)]">
                    <Phone className="h-3.5 w-3.5" />
                    {customer.phone}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-[var(--kit-muted-fg)]">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Member since {memberSince}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/account/profile"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--kit-border)] text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] hover:border-[var(--kit-accent)] transition-all min-h-[38px]"
          >
            <User className="h-3.5 w-3.5" />
            Edit Profile
          </Link>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Orders",
            value: totalOrders,
            icon: ShoppingBag,
            color: "text-[var(--kit-accent)]",
            bg: "bg-[var(--kit-accent)]/10",
          },
          {
            label: "Active",
            value: activeOrders,
            icon: Clock,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
          },
          {
            label: "Completed",
            value: completedOrders,
            icon: PackageCheck,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Addresses",
            value: addressCount,
            icon: MapPin,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-4 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-sm space-y-3"
            >
              <div className={`h-9 w-9 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-2xl font-black text-[var(--kit-text-primary)]">
                  {stat.value}
                </p>
                <p className="text-xs text-[var(--kit-muted-fg)] font-medium mt-0.5">
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Recent Orders + Default Address ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--kit-border)]">
            <h3 className="font-bold text-sm text-[var(--kit-text-primary)] tracking-tight">
              Recent Orders
            </h3>
            <Link
              href="/account/orders"
              className="text-xs font-semibold text-[var(--kit-accent)] hover:underline inline-flex items-center gap-1"
            >
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="px-5 py-10 text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-[var(--kit-surface)] flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-[var(--kit-muted-fg)]" />
              </div>
              <p className="text-sm font-medium text-[var(--kit-text-primary)]">No orders yet</p>
              <p className="text-xs text-[var(--kit-muted-fg)]">
                Your order history will appear here once you make a purchase.
              </p>
              <Link
                href="/catalog"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--kit-accent)] hover:underline mt-1"
              >
                Start shopping <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--kit-border)]">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-xs hover:bg-[var(--kit-surface)]/50 transition-colors">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-[var(--kit-accent)] truncate">
                      {order.order_number}
                    </p>
                    <p className="text-[var(--kit-muted-fg)] text-[11px] mt-0.5">
                      {new Date(order.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      · {order.lines.length} item{order.lines.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <Price
                        amount={koboToNaira(order.grand_total)}
                        currency={order.currency}
                        className="font-bold text-[var(--kit-text-primary)]"
                      />
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize mt-0.5 ${getStatusColor(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--kit-border)] text-[var(--kit-muted-fg)] hover:text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Default Address */}
        <div className="rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--kit-border)]">
            <h3 className="font-bold text-sm text-[var(--kit-text-primary)] tracking-tight">
              Default Address
            </h3>
            <Link
              href="/account/addresses"
              className="text-xs font-semibold text-[var(--kit-accent)] hover:underline inline-flex items-center gap-1"
            >
              Manage <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="px-5 py-4">
            {defaultAddress ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[var(--kit-accent)] shrink-0" />
                  <span className="text-sm font-semibold text-[var(--kit-text-primary)]">
                    {defaultAddress.label}
                  </span>
                </div>
                <div className="text-xs text-[var(--kit-muted-fg)] leading-relaxed space-y-0.5 pl-6">
                  <p>{defaultAddress.street_line_1}</p>
                  {defaultAddress.street_line_2 && <p>{defaultAddress.street_line_2}</p>}
                  <p>
                    {defaultAddress.city}
                    {defaultAddress.state ? `, ${defaultAddress.state}` : ""}
                  </p>
                  <p className="font-medium text-[var(--kit-text-primary)]">
                    {defaultAddress.country}
                  </p>
                </div>
                {addressCount > 1 && (
                  <p className="text-[11px] text-[var(--kit-muted-fg)] pl-6 pt-1">
                    +{addressCount - 1} other address{addressCount > 2 ? "es" : ""}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <div className="mx-auto h-10 w-10 rounded-full bg-[var(--kit-surface)] flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-[var(--kit-muted-fg)]" />
                </div>
                <p className="text-xs text-[var(--kit-muted-fg)]">
                  No addresses saved yet.
                </p>
                <Link
                  href="/account/addresses"
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity"
                >
                  Add Address
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "My Orders", href: "/account/orders", icon: ShoppingBag, desc: "View order history" },
          { label: "My Profile", href: "/account/profile", icon: User, desc: "Edit personal info" },
          { label: "Addresses", href: "/account/addresses", icon: MapPin, desc: "Manage locations" },
          { label: "Order Lookup", href: "/orders/lookup", icon: Search, desc: "Track a guest order" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col gap-2 p-4 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] hover:border-[var(--kit-accent)] hover:bg-[var(--kit-accent)]/5 transition-all shadow-sm"
            >
              <div className="h-9 w-9 rounded-lg bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] flex items-center justify-center group-hover:bg-[var(--kit-accent)] group-hover:text-[var(--kit-accent-fg)] transition-colors">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--kit-text-primary)]">{item.label}</p>
                <p className="text-[11px] text-[var(--kit-muted-fg)]">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--kit-muted-fg)] mt-auto self-end opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
