"use client";

import type { OrderStatusEventRow } from "@/lib/db/orders";
import { CheckCircle2, Clock, Truck, PackageCheck, AlertOctagon, Info } from "lucide-react";

interface OrderStatusTimelineProps {
  currentStatus: string;
  events?: OrderStatusEventRow[];
  createdAt: string;
}

export function OrderStatusTimeline({
  currentStatus,
  events = [],
  createdAt,
}: OrderStatusTimelineProps) {
  // Order status badge styling map
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "delivered":
        return <PackageCheck className="h-5 w-5 text-emerald-500" />;
      case "shipped":
        return <Truck className="h-5 w-5 text-blue-500" />;
      case "processing":
        return <Clock className="h-5 w-5 text-amber-500 font-bold" />;
      case "cancelled":
      case "failed":
        return <AlertOctagon className="h-5 w-5 text-rose-500" />;
      default:
        return <Info className="h-5 w-5 text-[var(--kit-accent)]" />;
    }
  };

  // Sort events chronologically
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="space-y-4 p-5 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)]">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--kit-border)]">
        <h4 className="font-bold text-sm text-[var(--kit-text-primary)] uppercase tracking-wider">
          Order Status Activity Timeline
        </h4>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--kit-surface)] border border-[var(--kit-border)] text-[var(--kit-text-primary)] capitalize">
          Current Status: {currentStatus}
        </span>
      </div>

      {sortedEvents.length > 0 ? (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--kit-border)]">
          {sortedEvents.map((ev) => (
            <div key={ev.id} className="relative flex items-start gap-4 group">
              <div className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--kit-card)] border-2 border-[var(--kit-accent)] shadow-sm shrink-0">
                <CheckCircle2 className="h-3 w-3 text-[var(--kit-accent)]" />
              </div>
              <div className="space-y-0.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--kit-text-primary)] capitalize">
                    {ev.to_status}
                  </span>
                  <span className="text-[10px] text-[var(--kit-muted-fg)]">
                    (from {ev.from_status})
                  </span>
                  {ev.actor && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--kit-surface)] text-[var(--kit-muted-fg)] border border-[var(--kit-border)]">
                      by {ev.actor}
                    </span>
                  )}
                </div>
                {ev.note && (
                  <p className="text-[var(--kit-muted-fg)] italic">{ev.note}</p>
                )}
                <p className="text-[10px] text-[var(--kit-muted-fg)]">
                  {new Date(ev.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Fallback data-driven display if order_status_events hasn't logged historical rows */
        <div className="flex items-center gap-4 p-4 rounded-lg bg-[var(--kit-surface)] border border-[var(--kit-border)] text-xs">
          {getStatusIcon(currentStatus)}
          <div>
            <p className="font-semibold text-[var(--kit-text-primary)] capitalize">
              Status: {currentStatus}
            </p>
            <p className="text-[var(--kit-muted-fg)]">
              Order created on {new Date(createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
