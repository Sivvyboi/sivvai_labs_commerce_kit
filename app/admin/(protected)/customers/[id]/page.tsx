/**
 * app/(admin)/customers/[id]/page.tsx
 *
 * Admin Customer Detail Page — Server Component.
 * Displays customer profile, saved addresses, and order history.
 */

import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Mail, Phone, MapPin, ShoppingBag } from "lucide-react";
import { clsx } from "clsx";

import { requirePermissionPage } from "@/lib/auth/admin-guard";
import { getCustomerProfile } from "@/services/customer-service";
import { getCustomerOrders } from "@/services/order-service";
import { OrdersTable } from "@/components/admin/tables/OrdersTable";

interface AdminCustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AdminCustomerDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const customer = await getCustomerProfile(id).catch(() => null);
  const name = customer ? `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || customer.email : "Customer";
  return {
    title: `${name} · Customer Profile`,
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminCustomerDetailPage({ params }: AdminCustomerDetailPageProps) {
  await requirePermissionPage("view_customers");
  const { id } = await params;
  const [customer, orders] = await Promise.all([
    getCustomerProfile(id).catch(() => null),
    getCustomerOrders(id).catch(() => []),
  ]);

  if (!customer) {
    notFound();
  }

  const fullName = `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || "Unnamed Customer";
  const totalSpent = orders.reduce((sum, o) => sum + (o.grand_total ?? 0), 0);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/customers"
          className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--kit-text-primary)]">{fullName}</h1>
          <p className="text-xs text-[var(--kit-text-secondary)]">Registered on {formatDate(customer.created_at)}</p>
        </div>
      </div>

      {/* Grid: Profile summary + Addresses */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] font-bold text-lg">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-[var(--kit-text-primary)]">{fullName}</p>
              <p className="text-xs text-[var(--kit-text-muted)]">ID: {customer.id.slice(0, 8)}…</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--kit-border)] text-xs">
            <div className="flex items-center gap-2 text-[var(--kit-text-secondary)]">
              <Mail size={14} className="text-[var(--kit-text-muted)] flex-shrink-0" />
              <span className="truncate">{customer.email}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--kit-text-secondary)]">
              <Phone size={14} className="text-[var(--kit-text-muted)] flex-shrink-0" />
              <span>{customer.phone ?? "No phone recorded"}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--kit-border)] grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-[var(--kit-radius-md)] bg-[var(--kit-surface)] p-2">
              <p className="font-bold text-[var(--kit-text-primary)]">{orders.length}</p>
              <p className="text-[10px] text-[var(--kit-text-muted)]">Orders</p>
            </div>
            <div className="rounded-[var(--kit-radius-md)] bg-[var(--kit-surface)] p-2">
              <p className="font-bold text-[var(--kit-text-primary)]">₦{(totalSpent / 100).toLocaleString("en-NG")}</p>
              <p className="text-[10px] text-[var(--kit-text-muted)]">Total Spent</p>
            </div>
          </div>
        </div>

        {/* Addresses Card */}
        <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4 md:col-span-2">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-[var(--kit-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Saved Addresses ({customer.addresses.length})</h2>
          </div>

          {customer.addresses.length === 0 ? (
            <p className="text-xs text-[var(--kit-text-muted)]">No saved addresses on file.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {customer.addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={clsx(
                    "rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] p-3 text-xs space-y-1 relative",
                    addr.is_default && "border-[var(--kit-accent)]/50"
                  )}
                >
                  <div className="flex items-center justify-between font-medium">
                    <span>{addr.label || "Address"}</span>
                    {addr.is_default && (
                      <span className="rounded-[var(--kit-radius-sm)] bg-[var(--kit-accent)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--kit-text-secondary)]">{addr.street_line_1}</p>
                  {addr.street_line_2 && <p className="text-[var(--kit-text-secondary)]">{addr.street_line_2}</p>}
                  <p className="text-[var(--kit-text-muted)]">
                    {addr.city}, {addr.state}, {addr.country}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order History */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShoppingBag size={16} className="text-[var(--kit-text-muted)]" />
          <h2 className="text-base font-semibold text-[var(--kit-text-primary)]">Order History</h2>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-[var(--kit-radius-lg)] border border-dashed border-[var(--kit-border)] bg-[var(--kit-surface)] p-8 text-center text-xs text-[var(--kit-text-muted)]">
            This customer has not placed any orders yet.
          </div>
        ) : (
          <OrdersTable orders={orders} />
        )}
      </div>
    </div>
  );
}
