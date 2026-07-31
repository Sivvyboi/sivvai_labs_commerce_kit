"use client";

/**
 * app/(admin)/orders/[id]/OrderDetailView.tsx
 *
 * Client Component view for admin order details.
 * Renders:
 *  - Order header with quick status updater
 *  - Order items line table
 *  - Customer info & shipping address
 *  - Payment attempts history
 *  - Order status history timeline
 *  - Internal Notes list + Add Note form
 */

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, CreditCard, MapPin, User, Package } from "lucide-react";
import { clsx } from "clsx";

import { useAdmin } from "@/features/admin/hooks/useAdmin";
import { updateOrderStatusAction, addOrderNoteAction } from "@/features/admin/actions/admin.actions";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { OrderStatusValues } from "@/lib/validation/admin";
import type { OrderWithLines } from "@/lib/db/orders";

interface OrderDetailViewProps {
  order: OrderWithLines;
}

function formatAmount(kobo: number | null): string {
  if (kobo == null) return "—";
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderDetailView({ order }: OrderDetailViewProps) {
  const { execute, loading, error } = useAdmin();

  const [selectedStatus, setSelectedStatus] = React.useState(order.status);
  const [statusNote, setStatusNote] = React.useState("");
  const [newNoteBody, setNewNoteBody] = React.useState("");

  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    await execute(() =>
      updateOrderStatusAction({
        order_id: order.id,
        status: selectedStatus as typeof OrderStatusValues[number],
        note: statusNote.trim() || undefined,
      })
    );
    setStatusNote("");
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNoteBody.trim()) return;

    const res = await execute(() =>
      addOrderNoteAction({
        order_id: order.id,
        body: newNoteBody.trim(),
        author_type: "admin",
      })
    );

    if (res?.success) {
      setNewNoteBody("");
    }
  }

  const customerName = order.customer
    ? `${order.customer.first_name ?? ""} ${order.customer.last_name ?? ""}`.trim() || order.customer.email
    : (order.guest_contact as { email?: string; name?: string } | null)?.name ?? "Guest Customer";

  const customerEmail = order.customer?.email ?? (order.guest_contact as { email?: string } | null)?.email;

  const address = order.shipping_address as {
    streetLine1?: string;
    street_line_1?: string;
    city?: string;
    state?: string;
    country?: string;
  } | null;

  const addressString = address
    ? [
        address.streetLine1 || address.street_line_1,
        address.city,
        address.state,
        address.country,
      ]
        .filter(Boolean)
        .join(", ")
    : "No shipping address provided";

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-[var(--kit-text-primary)]">
                {order.order_number}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs text-[var(--kit-text-muted)]">Placed on {formatDate(order.created_at)}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[var(--kit-radius-md)] border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-4 text-sm text-[var(--kit-danger)]">
          {error}
        </div>
      )}

      {/* Grid: Left 2 Cols (Items & Notes), Right 1 Col (Status Updater, Customer, Address) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Lines */}
          <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
            <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Order Items ({order.lines.length})</h2>

            <div className="divide-y divide-[var(--kit-border)] border border-[var(--kit-border)] rounded-[var(--kit-radius-md)] overflow-hidden">
              {order.lines.map((line) => (
                <div key={line.id} className="flex items-center justify-between p-3 text-sm bg-[var(--kit-surface)]">
                  <div className="flex items-center gap-3">
                    <Package size={16} className="text-[var(--kit-text-muted)] flex-shrink-0" />
                    <div>
                      <p className="font-medium text-[var(--kit-text-primary)]">{line.product_name_snapshot}</p>
                      <p className="text-xs text-[var(--kit-text-muted)]">SKU: {line.sku_snapshot ?? "—"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-[var(--kit-text-primary)]">{formatAmount(line.line_total)}</p>
                    <p className="text-xs text-[var(--kit-text-muted)]">
                      {line.quantity} × {formatAmount(line.unit_price_snapshot)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Summary */}
            <div className="space-y-1.5 pt-2 text-sm border-t border-[var(--kit-border)]">
              <div className="flex justify-between text-xs text-[var(--kit-text-secondary)]">
                <span>Subtotal</span>
                <span>{formatAmount(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--kit-text-secondary)]">
                <span>Shipping</span>
                <span>{formatAmount(order.shipping_total)}</span>
              </div>
              {order.discount_total > 0 && (
                <div className="flex justify-between text-xs text-[var(--kit-success)]">
                  <span>Discount</span>
                  <span>-{formatAmount(order.discount_total)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 text-base font-bold text-[var(--kit-text-primary)] border-t border-[var(--kit-border)]">
                <span>Grand Total</span>
                <span>{formatAmount(order.grand_total)}</span>
              </div>
            </div>
          </div>

          {/* Internal Notes Section */}
          <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-[var(--kit-accent)]" />
              <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Internal Notes</h2>
            </div>

            {(!order.notes || order.notes.length === 0) ? (
              <p className="text-xs text-[var(--kit-text-muted)]">No internal notes for this order.</p>
            ) : (
              <div className="space-y-3">
                {order.notes.map((note) => (
                  <div key={note.id} className="rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] p-3 text-xs">
                    <p className="text-[var(--kit-text-primary)]">{note.body}</p>
                    <p className="mt-1 text-[10px] text-[var(--kit-text-muted)]">
                      Author: {note.author_type} • {formatDate(note.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="pt-3 border-t border-[var(--kit-border)] flex gap-2">
              <input
                type="text"
                value={newNoteBody}
                onChange={(e) => setNewNoteBody(e.target.value)}
                placeholder="Add an internal note…"
                required
                className={clsx(
                  "h-9 flex-1 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-xs text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
              <button
                type="submit"
                disabled={loading || !newNoteBody.trim()}
                className="h-9 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-3 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Add Note
              </button>
            </form>
          </div>
        </div>

        {/* Right 1 Col */}
        <div className="space-y-6">
          {/* Status Updater */}
          <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
            <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Update Order Status</h2>

            <form onSubmit={handleStatusUpdate} className="space-y-3">
              <div>
                <label htmlFor="order-status-updater-select" className="block text-xs font-medium text-[var(--kit-text-secondary)]">New Status</label>
                <select
                  id="order-status-updater-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className={clsx(
                    "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                    "bg-[var(--kit-surface)] px-3 text-xs font-medium text-[var(--kit-text-primary)]",
                    "focus:border-[var(--kit-accent)] focus:outline-none"
                  )}
                >
                  {OrderStatusValues.map((st) => (
                    <option key={st} value={st}>
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="order-status-note-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Status Note (Optional)</label>
                <input
                  id="order-status-note-input"
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g. Tracking ID: NIPOST-12345"
                  className={clsx(
                    "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                    "bg-[var(--kit-surface)] px-3 text-xs text-[var(--kit-text-primary)]",
                    "focus:border-[var(--kit-accent)] focus:outline-none"
                  )}
                />
              </div>

              <button
                type="submit"
                disabled={loading || selectedStatus === order.status}
                className="w-full h-9 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Updating…" : "Update Status"}
              </button>
            </form>
          </div>

          {/* Customer & Shipping */}
          <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
            <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Customer Information</h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2">
                <User size={14} className="text-[var(--kit-text-muted)] mt-0.5" />
                <div>
                  <p className="font-medium text-[var(--kit-text-primary)]">{customerName}</p>
                  <p className="text-[var(--kit-text-muted)]">{customerEmail ?? "No email provided"}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2 border-t border-[var(--kit-border)]">
                <MapPin size={14} className="text-[var(--kit-text-muted)] mt-0.5" />
                <div>
                  <p className="font-medium text-[var(--kit-text-primary)]">Shipping Address</p>
                  <p className="text-[var(--kit-text-secondary)]">{addressString}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Attempts */}
          <div className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-sm)] space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-[var(--kit-text-muted)]" />
              <h2 className="text-sm font-semibold text-[var(--kit-text-primary)]">Payment Information</h2>
            </div>

            {(!order.payment_attempts || order.payment_attempts.length === 0) ? (
              <p className="text-xs text-[var(--kit-text-muted)]">No payment attempt recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {order.payment_attempts.map((pa) => (
                  <div key={pa.id} className="rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] p-2.5 text-xs">
                    <div className="flex justify-between font-medium">
                      <span>{pa.provider.toUpperCase()}</span>
                      <StatusBadge status={pa.status} />
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-[var(--kit-text-muted)]">Ref: {pa.provider_reference ?? pa.idempotency_key}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
