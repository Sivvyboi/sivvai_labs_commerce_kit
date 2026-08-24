import type { Metadata } from "next";
import { getCurrentUser, getOrCreateCustomer } from "@/lib/auth/server-auth";
import * as orderRepo from "@/lib/db/orders";
import { OrdersTable } from "@/components/storefront/account/OrdersTable";
import { OrderCard } from "@/components/storefront/account/OrderCard";
import { EmptyOrdersState } from "@/components/storefront/account/EmptyOrdersState";
import { ShoppingBag } from "lucide-react";

export const metadata: Metadata = {
  title: "Order History",
  description: "View your past orders and track their status.",
};

export const revalidate = 0;

export default async function AccountOrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const customer = await getOrCreateCustomer(user);
  const orders = await orderRepo.findCustomerOrders(customer.id).catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--kit-border)]">
        <div className="h-10 w-10 rounded-full bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] flex items-center justify-center">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--kit-text-primary)]">Order History</h2>
          <p className="text-xs text-[var(--kit-muted-fg)]">
            {orders.length > 0
              ? `${orders.length} order${orders.length !== 1 ? "s" : ""} found`
              : "No orders placed yet."}
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyOrdersState type="orders" />
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden md:block">
            <OrdersTable orders={orders} />
          </div>

          {/* Mobile: cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
