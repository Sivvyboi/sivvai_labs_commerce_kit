"use client";

import { useState } from "react";
import type { OrderWithLines } from "@/lib/db/orders";
import { useAccount } from "@/features/storefront/hooks/useAccount";
import { Search, Mail, Hash, Loader2, AlertCircle } from "lucide-react";
import { OrderStatusTimeline } from "./OrderStatusTimeline";
import { OrderItemsList } from "./OrderItemsList";
import { OrderSummaryCard } from "./OrderSummaryCard";

export function GuestOrderLookupForm() {
  const { lookupOrder, isLoading } = useAccount();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [foundOrder, setFoundOrder] = useState<OrderWithLines | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFoundOrder(null);

    const res = await lookupOrder({
      orderNumber: orderNumber.trim(),
      email: email.trim().toLowerCase(),
    });

    if (res.success && res.order) {
      setFoundOrder(res.order as OrderWithLines);
    } else {
      setErrorMsg(res.error || "No order matching those details was found.");
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="p-6 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] space-y-4 shadow-sm max-w-xl mx-auto">
        <div className="space-y-1 text-center pb-2">
          <h2 className="text-xl font-bold text-[var(--kit-text-primary)]">Track Your Order</h2>
          <p className="text-xs text-[var(--kit-muted-fg)]">
            Enter your order number and the email address used during purchase.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-3 p-4 text-xs font-medium text-rose-800 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800/50">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="orderNum" className="block text-xs font-semibold uppercase tracking-wider text-[var(--kit-muted-fg)]">
            Order Number
          </label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)]" />
            <input
              id="orderNum"
              type="text"
              required
              placeholder="e.g. ORD-123456-789"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm font-mono rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] min-h-[44px]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="lookupEmail" className="block text-xs font-semibold uppercase tracking-wider text-[var(--kit-muted-fg)]">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)]" />
            <input
              id="lookupEmail"
              type="email"
              required
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] min-h-[44px]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--kit-accent)] px-6 py-3 text-sm font-semibold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[44px] shadow-sm disabled:opacity-50 mt-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span>Track Order</span>
        </button>
      </form>

      {/* Render order details if found */}
      {foundOrder && (
        <div className="space-y-6 pt-4 border-t border-[var(--kit-border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-[var(--kit-text-primary)]">
                Order #{foundOrder.order_number}
              </h3>
              <p className="text-xs text-[var(--kit-muted-fg)]">
                Placed on {new Date(foundOrder.created_at).toLocaleDateString()}
              </p>
            </div>
            <span className="self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 capitalize">
              {foundOrder.status}
            </span>
          </div>

          <OrderStatusTimeline
            currentStatus={foundOrder.status}
            events={foundOrder.status_events}
            createdAt={foundOrder.created_at}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <OrderItemsList lines={foundOrder.lines} />
            </div>
            <div>
              <OrderSummaryCard order={foundOrder} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
