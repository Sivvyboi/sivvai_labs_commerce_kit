/**
 * components/storefront/checkout/OrderConfirmationCard.tsx
 *
 * Server Component — renders the complete order confirmation summary.
 * Composes existing shared components:
 *   - OrderItemsList  (account area)  — already handles Kobo → Naira
 *   - OrderSummaryCard (account area) — already handles Kobo → Naira
 *   - CopyButton (client island)      — clipboard access
 *
 * Money invariant: ALL stored minor-unit values pass through koboToNaira()
 * before reaching <Price>. OrderItemsList and OrderSummaryCard already do
 * this correctly; we do not reimplement formatting here.
 */

import Link from "next/link";
import type { OrderWithLines } from "@/lib/db/orders";
import { OrderItemsList } from "@/components/storefront/account/OrderItemsList";
import { OrderSummaryCard } from "@/components/storefront/account/OrderSummaryCard";
import { CopyButton } from "@/components/shared/CopyButton";
import { ROUTES } from "@/constants/routes";
import {
  Calendar,
  Hash,
  CreditCard,
  Package,
  UserCircle2,
} from "lucide-react";

interface OrderConfirmationCardProps {
  order: OrderWithLines;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatOrderDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case "processing":
      return "bg-blue-500/15 text-blue-600 border-blue-500/30";
    case "completed":
      return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
    case "pending":
      return "bg-amber-500/15 text-amber-600 border-amber-500/30";
    case "cancelled":
    case "refunded":
      return "bg-red-500/15 text-red-600 border-red-500/30";
    default:
      return "bg-[var(--kit-surface)] text-[var(--kit-text-primary)] border-[var(--kit-border)]";
  }
}

function resolveProviderLabel(provider: string): string {
  switch (provider.toLowerCase()) {
    case "paystack":
      return "Paystack";
    case "bank_transfer":
      return "Bank Transfer";
    case "flutterwave":
      return "Flutterwave";
    default:
      return provider;
  }
}

// ─── Shipping snapshot types ──────────────────────────────────────────────────

interface ShippingMethodSnapshot {
  name?: string;
  type?: string;
  description?: string;
  estimated_delivery?: string;
  estimatedDelivery?: string;
}

// ─── Section: Order Metadata ─────────────────────────────────────────────────

function OrderMetaSection({ order }: { order: OrderWithLines }) {
  const latestPayment = order.payment_attempts?.[0] ?? null;
  const providerLabel = latestPayment
    ? resolveProviderLabel(latestPayment.provider)
    : null;

  // Safely surface the provider_reference for display — never expose secrets
  const providerRef = latestPayment?.provider_reference ?? null;

  return (
    <div className="rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-5 space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--kit-border)]">
        <Hash className="h-4 w-4 text-[var(--kit-accent)] shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--kit-text-primary)]">
          Order Information
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
        {/* Order Number */}
        <div className="space-y-1">
          <p className="text-[var(--kit-muted-fg)] uppercase tracking-wide text-[10px] font-semibold">
            Order Number
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-[var(--kit-accent)] text-sm break-all">
              {order.order_number}
            </span>
            <CopyButton value={order.order_number} label="Copy order number" />
          </div>
        </div>

        {/* Order Date */}
        <div className="space-y-1">
          <p className="text-[var(--kit-muted-fg)] uppercase tracking-wide text-[10px] font-semibold">
            Order Date
          </p>
          <div className="flex items-center gap-1.5 text-[var(--kit-text-primary)]">
            <Calendar className="h-3.5 w-3.5 text-[var(--kit-muted-fg)] shrink-0" />
            <span className="font-medium">{formatOrderDate(order.created_at)}</span>
          </div>
        </div>

        {/* Payment Status */}
        <div className="space-y-1">
          <p className="text-[var(--kit-muted-fg)] uppercase tracking-wide text-[10px] font-semibold">
            Payment Status
          </p>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold capitalize ${statusBadgeClass(order.status)}`}
          >
            {order.status}
          </span>
        </div>

        {/* Payment Method */}
        {providerLabel && (
          <div className="space-y-1">
            <p className="text-[var(--kit-muted-fg)] uppercase tracking-wide text-[10px] font-semibold">
              Payment Method
            </p>
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-[var(--kit-muted-fg)] shrink-0" />
              <span className="font-semibold text-[var(--kit-text-primary)]">
                {providerLabel}
              </span>
            </div>
          </div>
        )}

        {/* Provider Reference — customer-safe, not a secret */}
        {providerRef && (
          <div className="space-y-1 sm:col-span-2">
            <p className="text-[var(--kit-muted-fg)] uppercase tracking-wide text-[10px] font-semibold">
              Payment Reference
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] text-[var(--kit-muted-fg)] break-all">
                {providerRef}
              </span>
              <CopyButton value={providerRef} label="Copy reference" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section: Delivery Info (shipping method + estimate) ─────────────────────

function DeliveryInfoSection({ order }: { order: OrderWithLines }) {
  const snapshot = order.shipping_method_snapshot as ShippingMethodSnapshot | null;
  if (!snapshot) return null;

  const methodName = snapshot.name ?? snapshot.type ?? "Standard Delivery";
  const estimate = snapshot.estimated_delivery ?? snapshot.estimatedDelivery ?? null;

  return (
    <div className="rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-5 space-y-3 shadow-xs">
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--kit-border)]">
        <Package className="h-4 w-4 text-[var(--kit-accent)] shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--kit-text-primary)]">
          Delivery
        </span>
      </div>

      <div className="text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[var(--kit-muted-fg)]">Shipping Method</span>
          <span className="font-semibold text-[var(--kit-text-primary)]">{methodName}</span>
        </div>
        {estimate && (
          <div className="flex items-center justify-between">
            <span className="text-[var(--kit-muted-fg)]">Estimated Delivery</span>
            <span className="font-medium text-[var(--kit-text-primary)]">{estimate}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section: Account CTA ─────────────────────────────────────────────────────

function AccountCtaSection({ order }: { order: OrderWithLines }) {
  const isAccountOrder = Boolean(order.customer_id);

  return (
    <div className="rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-5 space-y-3 shadow-xs">
      <div className="flex items-center gap-2">
        <UserCircle2 className="h-4 w-4 text-[var(--kit-accent)] shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--kit-text-primary)]">
          Order Tracking
        </span>
      </div>

      {isAccountOrder ? (
        <div className="space-y-2 text-xs text-[var(--kit-muted-fg)]">
          <p>You can view the full status of this order from your account.</p>
          <Link
            href={ROUTES.order(order.id)}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--kit-surface)] border border-[var(--kit-border)] px-4 py-2.5 text-xs font-semibold text-[var(--kit-text-primary)] hover:border-[var(--kit-accent)] hover:text-[var(--kit-accent)] transition-colors min-h-[40px]"
          >
            <Package className="h-3.5 w-3.5" />
            Track My Order
          </Link>
        </div>
      ) : (
        <p className="text-xs text-[var(--kit-muted-fg)]">
          You placed this order as a guest. Create an account to track all your orders in one place.
        </p>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function OrderConfirmationCard({ order }: OrderConfirmationCardProps) {
  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      {/* 1. Order Metadata */}
      <OrderMetaSection order={order} />

      {/* 2. Ordered Items — reuses existing account component (Kobo → Naira already correct) */}
      <section aria-label="Ordered items">
        <OrderItemsList lines={order.lines} />
      </section>

      {/* 3. Totals + Shipping Address — reuses existing account component */}
      <section aria-label="Order totals and shipping address">
        <OrderSummaryCard order={order} />
      </section>

      {/* 4. Delivery Info (shipping method snapshot) */}
      <DeliveryInfoSection order={order} />

      {/* 5. Account / Tracking CTA */}
      <AccountCtaSection order={order} />
    </div>
  );
}
