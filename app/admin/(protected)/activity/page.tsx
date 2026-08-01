/**
 * app/(admin)/activity/page.tsx
 *
 * System Activity Log Page — Server Component.
 * Synthesizes order, stock, note, and customer events into an operational timeline.
 */

import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Activity, ShoppingBag, Warehouse, MessageSquare, User, ArrowRight } from "lucide-react";
import { clsx } from "clsx";

import { getSystemActivityFeed } from "@/features/admin/utils/activity";

export const metadata: Metadata = {
  title: "System Activity Log",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminActivityPage() {
  const feed = await getSystemActivityFeed(40);

  const iconMap = {
    order: ShoppingBag,
    stock: Warehouse,
    note: MessageSquare,
    customer: User,
  };

  const badgeStyles = {
    info: "bg-[var(--kit-info)]/15 text-[var(--kit-info)] border-[var(--kit-info)]/20",
    warning: "bg-[var(--kit-warning)]/15 text-[var(--kit-warning)] border-[var(--kit-warning)]/20",
    success: "bg-[var(--kit-success)]/15 text-[var(--kit-success)] border-[var(--kit-success)]/20",
    neutral: "bg-[var(--kit-muted)] text-[var(--kit-text-muted)] border-[var(--kit-border)]",
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-[var(--kit-accent)]" />
          <h1 className="text-xl font-bold text-[var(--kit-text-primary)]">System Activity Log</h1>
        </div>
        <p className="mt-0.5 text-sm text-[var(--kit-text-secondary)]">
          Real-time operational timeline across orders, stock movements, notes, and customer signups
        </p>
      </div>

      {feed.length === 0 ? (
        <div className="rounded-[var(--kit-radius-lg)] border border-dashed border-[var(--kit-border)] bg-[var(--kit-surface)] p-12 text-center text-xs text-[var(--kit-text-muted)]">
          No activity recorded in the system yet.
        </div>
      ) : (
        <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)]">
          <ol className="relative border-l border-[var(--kit-border)] ml-3 space-y-6">
            {feed.map((item) => {
              const Icon = iconMap[item.type] ?? Activity;

              return (
                <li key={item.id} className="ml-6 flex items-start justify-between group">
                  {/* Timeline dot icon */}
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--kit-card)] border border-[var(--kit-border)] text-[var(--kit-text-muted)] group-hover:border-[var(--kit-accent)] group-hover:text-[var(--kit-accent)] transition-colors">
                    <Icon size={12} />
                  </span>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--kit-text-primary)]">{item.title}</span>
                      <span
                        className={clsx(
                          "rounded-[var(--kit-radius-sm)] border px-1.5 py-0.2 text-[10px] font-bold uppercase",
                          badgeStyles[item.badge.variant]
                        )}
                      >
                        {item.badge.label}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--kit-text-secondary)]">{item.description}</p>
                    <p className="text-[10px] text-[var(--kit-text-muted)]">{formatDate(item.timestamp)}</p>
                  </div>

                  {item.link && (
                    <Link
                      href={item.link}
                      className="inline-flex items-center gap-1 text-xs text-[var(--kit-accent)] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View <ArrowRight size={12} />
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
