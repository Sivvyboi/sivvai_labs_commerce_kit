/**
 * app/(storefront)/checkout/confirmation/page.tsx
 *
 * Order Confirmation Page — enhanced.
 *
 * Attempts to load the full order associated with the checkout session
 * via the payment_attempts bridge. Renders:
 *   - Full order summary (items, totals, shipping, payment info)  when order found
 *   - Minimal session status card as graceful degradation when order not yet available
 *
 * Security:
 *   - Uses the server Supabase client (RLS-gated)
 *   - Never uses the admin/service-role client
 *   - Does NOT trust any client-supplied totals
 *   - Order data is fetched exclusively from the established DB read path
 */

import type { Metadata } from "next";
import Link from "next/link";
import * as checkoutRepo from "@/lib/db/checkout";
import * as orderRepo from "@/lib/db/orders";
import { siteConfig } from "@/config/site";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { OrderConfirmationCard } from "@/components/storefront/checkout/OrderConfirmationCard";
import { ROUTES } from "@/constants/routes";
import { CheckCircle2, ShoppingBag, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Order Confirmed — ${siteConfig.name}`,
  description: "Thank you for your order. Your transaction has been received.",
  robots: { index: false, follow: false },
};

export interface ConfirmationPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function OrderConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const { session_id: sessionId } = await searchParams;

  // Fetch checkout session for graceful fallback display
  let session = null;
  if (sessionId) {
    session = await checkoutRepo.findCheckoutSessionById(sessionId);
  }

  // Attempt to resolve the confirmed order via payment_attempts bridge.
  // This will be null if payment is still pending / session not yet fulfilled.
  let order: orderRepo.OrderWithLines | null = null;
  if (sessionId) {
    order = await orderRepo.findOrderByCheckoutSessionId(sessionId);
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <Breadcrumb
        items={[
          { label: "Home", href: ROUTES.home },
          { label: "Catalog", href: ROUTES.catalog },
          { label: "Order Confirmation" },
        ]}
      />

      {/* ── Confirmation Header ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-2xl text-center space-y-5 py-4">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--kit-text-primary)]">
            Thank You For Your Order!
          </h1>
          <p className="text-sm text-[var(--kit-muted-fg)] max-w-md mx-auto">
            {order
              ? "Your payment has been confirmed. We've reserved your items and sent a confirmation to your email."
              : "Your payment initiation has been received. We have reserved your items and sent confirmation to your email."}
          </p>
        </div>
      </div>

      {/* ── Full Order Summary (when order is available) ────────────────────── */}
      {order && (
        <OrderConfirmationCard order={order} />
      )}

      {/* ── Fallback: Session Card (when order not yet created) ─────────────── */}
      {!order && session && (
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 space-y-3 text-left shadow-xs text-xs sm:text-sm">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--kit-border)]">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--kit-text-primary)]">
                Order Processing
              </span>
            </div>
            <p className="text-[var(--kit-muted-fg)]">
              Your payment is being processed. Your order details will be available shortly.
              Please check your email for confirmation.
            </p>
            <div className="flex justify-between text-[var(--kit-muted-fg)] pt-1">
              <span>Session Reference</span>
              <span className="font-mono font-semibold text-[var(--kit-text-primary)]">
                {session.id.slice(0, 8)}…
              </span>
            </div>
            <div className="flex justify-between text-[var(--kit-muted-fg)]">
              <span>Status</span>
              <span className="font-bold text-amber-500 capitalize">{session.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Continue Shopping CTA ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 pb-8">
        <Link
          href={ROUTES.catalog}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--kit-accent)] px-6 py-3.5 text-sm font-bold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Continue Shopping</span>
        </Link>
      </div>
    </div>
  );
}
