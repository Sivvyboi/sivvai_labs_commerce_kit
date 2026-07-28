import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server-auth";
import * as customerRepo from "@/lib/db/customers";
import * as orderRepo from "@/lib/db/orders";
import { Price } from "@/components/shared/Price";
import { ShoppingBag, Clock, PackageCheck, MapPin, ChevronRight, User } from "lucide-react";

export const revalidate = 0;

export default async function AccountOverviewPage() {
  const user = await getCurrentUser();

  // Retrieve customer data if auth active, otherwise query fallback
  let customer = user ? await customerRepo.findCustomerByAuthId(user.id) : null;
  if (!customer && user?.email) {
    customer = await customerRepo.findCustomerByEmail(user.email);
  }

  const orders = customer ? await orderRepo.findCustomerOrders(customer.id) : [];
  const addresses = customer ? customer.addresses || [] : [];

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

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] flex items-center justify-center font-bold text-lg">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--kit-text-primary)]">
              Welcome back, {customer?.first_name || "Valued Customer"}!
            </h2>
            <p className="text-xs text-[var(--kit-muted-fg)]">
              {customer?.email || "Guest Preview Mode"}
            </p>
          </div>
        </div>

        <Link
          href="/account/profile"
          className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--kit-border)] text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors min-h-[36px] flex items-center"
        >
          Edit Profile
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-[var(--kit-muted-fg)]">
            <span className="text-xs font-medium">Total Orders</span>
            <ShoppingBag className="h-4 w-4 text-[var(--kit-accent)]" />
          </div>
          <p className="text-2xl font-black text-[var(--kit-text-primary)]">{totalOrders}</p>
        </div>

        <div className="p-4 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-[var(--kit-muted-fg)]">
            <span className="text-xs font-medium">Active Orders</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-[var(--kit-text-primary)]">{activeOrders}</p>
        </div>

        <div className="p-4 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-[var(--kit-muted-fg)]">
            <span className="text-xs font-medium">Completed</span>
            <PackageCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-[var(--kit-text-primary)]">{completedOrders}</p>
        </div>

        <div className="p-4 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-[var(--kit-muted-fg)]">
            <span className="text-xs font-medium">Addresses</span>
            <MapPin className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-[var(--kit-text-primary)]">{addressCount}</p>
        </div>
      </div>

      {/* Grid for Recent Orders & Default Address */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders List */}
        <div className="lg:col-span-2 space-y-4 p-5 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--kit-border)]">
            <h3 className="font-bold text-sm text-[var(--kit-text-primary)] uppercase tracking-wider">
              Recent Orders
            </h3>
            <Link
              href="/account/orders"
              className="text-xs font-semibold text-[var(--kit-accent)] hover:underline inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-[var(--kit-muted-fg)] py-6 text-center">
              No recent orders found.
            </p>
          ) : (
            <div className="divide-y divide-[var(--kit-border)]">
              {recentOrders.map((order) => (
                <div key={order.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-mono font-bold text-[var(--kit-accent)]">
                      {order.order_number}
                    </p>
                    <p className="text-[var(--kit-muted-fg)] text-[11px]">
                      {new Date(order.created_at).toLocaleDateString()} • {order.lines.length} item(s)
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <Price amount={order.grand_total} currency={order.currency} className="font-bold text-[var(--kit-text-primary)]" />
                      <p className="text-[10px] capitalize text-emerald-600 font-semibold">{order.status}</p>
                    </div>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="p-1.5 rounded-lg border border-[var(--kit-border)] hover:bg-[var(--kit-surface)] text-[var(--kit-muted-fg)] hover:text-[var(--kit-text-primary)]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Default Shipping Address */}
        <div className="space-y-4 p-5 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--kit-border)]">
            <h3 className="font-bold text-sm text-[var(--kit-text-primary)] uppercase tracking-wider">
              Default Address
            </h3>
            <Link
              href="/account/addresses"
              className="text-xs font-semibold text-[var(--kit-accent)] hover:underline inline-flex items-center gap-1"
            >
              <span>Manage</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {defaultAddress ? (
            <div className="text-xs text-[var(--kit-muted-fg)] space-y-1 leading-relaxed">
              <p className="font-bold text-[var(--kit-text-primary)]">{defaultAddress.label}</p>
              <p>{defaultAddress.street_line_1}</p>
              {defaultAddress.street_line_2 && <p>{defaultAddress.street_line_2}</p>}
              <p>{defaultAddress.city}, {defaultAddress.state}</p>
              <p className="font-semibold text-[var(--kit-text-primary)]">{defaultAddress.country}</p>
            </div>
          ) : (
            <div className="text-xs text-[var(--kit-muted-fg)] py-6 text-center space-y-2">
              <p>No default address set.</p>
              <Link
                href="/account/addresses"
                className="inline-block px-3 py-1.5 text-xs font-semibold rounded bg-[var(--kit-accent)] text-[var(--kit-accent-fg)]"
              >
                Add Address
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
