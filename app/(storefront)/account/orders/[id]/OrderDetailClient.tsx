"use client";

import { useState } from "react";
import type { OrderWithLines } from "@/lib/db/orders";
import { OrderStatusTimeline } from "@/components/storefront/account/OrderStatusTimeline";
import { OrderItemsList } from "@/components/storefront/account/OrderItemsList";
import { OrderSummaryCard } from "@/components/storefront/account/OrderSummaryCard";
import { reorderAction } from "@/features/storefront/actions/account.actions";
import { ArrowLeft, ShoppingCart, RotateCcw, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface OrderDetailClientProps {
  order: OrderWithLines;
}

export function OrderDetailClient({ order }: OrderDetailClientProps) {
  const [isReordering, setIsReordering] = useState(false);
  const [reorderResult, setReorderResult] = useState<{
    addedCount?: number;
    skippedItems?: Array<{ productName: string; reason: string }>;
    error?: string;
  } | null>(null);

  const handleReorder = async () => {
    setIsReordering(true);
    setReorderResult(null);
    const res = await reorderAction(order.id);
    if (res.success) {
      const successRes = res as { success: true; addedCount: number; skippedItems: Array<{ productName: string; reason: string }> };
      setReorderResult({
        addedCount: successRes.addedCount,
        skippedItems: successRes.skippedItems,
      });
    } else {
      setReorderResult({ error: res.error });
    }
    setIsReordering(false);
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--kit-border)]">
        <div className="flex items-center gap-3">
          <Link
            href="/account/orders"
            className="p-2 rounded-lg border border-[var(--kit-border)] text-[var(--kit-muted-fg)] hover:text-[var(--kit-text-primary)] hover:bg-[var(--kit-surface)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-lg font-bold text-[var(--kit-text-primary)]">
              Order #{order.order_number}
            </h2>
            <p className="text-xs text-[var(--kit-muted-fg)]">
              Placed on {new Date(order.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[var(--kit-surface)] border border-[var(--kit-border)] text-[var(--kit-text-primary)] capitalize">
            {order.status}
          </span>
          <button
            onClick={handleReorder}
            disabled={isReordering}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[44px] shadow-sm disabled:opacity-50"
          >
            {isReordering ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            <span>Reorder</span>
          </button>
        </div>
      </div>

      {/* Reorder Result Banner */}
      {reorderResult && !reorderResult.error && (
        <div className="space-y-3">
          {reorderResult.addedCount !== undefined && reorderResult.addedCount > 0 && (
            <div className="flex items-center gap-3 p-4 text-xs font-medium text-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                {reorderResult.addedCount} item(s) added to your cart.{" "}
                <Link href="/cart" className="underline font-bold inline-flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" /> View Cart
                </Link>
              </span>
            </div>
          )}
          {reorderResult.skippedItems && reorderResult.skippedItems.length > 0 && (
            <div className="p-4 text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800/50 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Some items could not be reordered:</span>
              </div>
              <ul className="pl-6 space-y-0.5 list-disc">
                {reorderResult.skippedItems.map((item, i) => (
                  <li key={i}>
                    <span className="font-semibold">{item.productName}</span>: {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {reorderResult?.error && (
        <div className="flex items-center gap-3 p-4 text-xs font-medium text-rose-800 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800/50">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{reorderResult.error}</span>
        </div>
      )}

      {/* Timeline */}
      <OrderStatusTimeline
        currentStatus={order.status}
        events={order.status_events}
        createdAt={order.created_at}
      />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <OrderItemsList lines={order.lines} />

          {/* Order Notes */}
          {order.notes && order.notes.length > 0 && (
            <div className="p-5 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] space-y-3">
              <h4 className="font-bold text-sm text-[var(--kit-text-primary)] uppercase tracking-wider">
                Order Notes
              </h4>
              <div className="space-y-2">
                {order.notes.map((note) => (
                  <div key={note.id} className="p-3 rounded-lg bg-[var(--kit-surface)] border border-[var(--kit-border)] text-xs">
                    <p className="text-[var(--kit-text-primary)]">{note.body}</p>
                    <p className="text-[var(--kit-muted-fg)] mt-1">
                      {note.author_type} · {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <OrderSummaryCard order={order} />
        </div>
      </div>
    </div>
  );
}
