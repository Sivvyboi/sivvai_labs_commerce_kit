/**
 * app/(storefront)/checkout/confirmation/page.tsx
 *
 * Order Confirmation Page.
 * Displayed after a customer completes payment or places an order via checkout session.
 */

import type { Metadata } from "next";
import Link from "next/link";
import * as checkoutRepo from "@/lib/db/checkout";
import { siteConfig } from "@/config/site";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { ROUTES } from "@/constants/routes";
import { CheckCircle2, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Order Confirmation — ${siteConfig.name}`,
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

  let session = null;
  if (sessionId) {
    session = await checkoutRepo.findCheckoutSessionById(sessionId);
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

      <div className="mx-auto max-w-2xl text-center space-y-6 py-8">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--kit-text-primary)]">
            Thank You For Your Order!
          </h1>
          <p className="text-sm text-[var(--kit-muted-fg)] max-w-md mx-auto">
            Your payment initiation has been received. We have reserved your items and sent confirmation to your email.
          </p>
        </div>

        {session && (
          <div className="rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 space-y-3 text-left max-w-md mx-auto shadow-xs text-xs sm:text-sm">
            <div className="flex justify-between border-b border-[var(--kit-border)] pb-2 text-[var(--kit-muted-fg)]">
              <span>Checkout Session Reference</span>
              <span className="font-mono font-semibold text-[var(--kit-text-primary)]">
                {session.id.slice(0, 8)}...
              </span>
            </div>
            <div className="flex justify-between text-[var(--kit-muted-fg)]">
              <span>Status</span>
              <span className="font-bold text-emerald-500 uppercase">
                {session.status}
              </span>
            </div>
          </div>
        )}

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={ROUTES.catalog}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--kit-accent)] px-6 py-3.5 text-sm font-bold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[48px] w-full sm:w-auto"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
