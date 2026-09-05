"use client";

/**
 * components/admin/tables/InventoryTable.tsx
 *
 * Inventory management table with inline stock editing and manual adjustment modal.
 * Client Component.
 */

import * as React from "react";
import {
  Edit2,
  AlertTriangle,
  CheckCircle,
  Package,
  Clock,
  RotateCcw,
  Loader2,
  X,
} from "lucide-react";
import { clsx } from "clsx";

import { useAdmin } from "@/features/admin/hooks/useAdmin";
import {
  updateInventoryAction,
  getActiveReservationsAction,
  releaseInventoryReservationAction,
} from "@/features/admin/actions/inventory.actions";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";

import type { InventoryWithVariant, InventoryReservationRow } from "@/lib/db/inventory";

interface InventoryTableProps {
  items: InventoryWithVariant[];
  canManage?: boolean;
}

export function InventoryTable({ items, canManage = true }: InventoryTableProps) {
  const { execute, loading, error, clearError } = useAdmin();

  // Manual adjustment modal target
  const [modalTarget, setModalTarget] = React.useState<InventoryWithVariant | null>(null);
  const [newQty, setNewQty] = React.useState<number>(0);
  const [reason, setReason] = React.useState<string>("manual_adjustment");

  // Active reservations state for open modal
  const [reservations, setReservations] = React.useState<InventoryReservationRow[]>([]);
  const [loadingReservations, setLoadingReservations] = React.useState(false);
  const [reservationError, setReservationError] = React.useState<string | null>(null);
  const [releaseConfirmTarget, setReleaseConfirmTarget] =
    React.useState<InventoryReservationRow | null>(null);
  const [releasing, setReleasing] = React.useState(false);

  async function loadReservations(recordId: string) {
    setLoadingReservations(true);
    setReservationError(null);
    try {
      const res = await getActiveReservationsAction(recordId);
      if (res.success && res.data) {
        setReservations(res.data);
      } else {
        setReservationError(res.error ?? "Failed to load reservations");
      }
    } catch {
      setReservationError("Failed to load reservations");
    } finally {
      setLoadingReservations(false);
    }
  }

  function openAdjustmentModal(item: InventoryWithVariant) {
    setModalTarget(item);
    setNewQty(item.on_hand_quantity);
    setReason("manual_adjustment");
    setReservations([]);
    clearError();
    loadReservations(item.id);
  }

  async function handleSaveAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!modalTarget) return;

    const result = await execute(() =>
      updateInventoryAction({
        inventory_record_id: modalTarget.id,
        variant_id: modalTarget.variant_id,
        new_quantity: newQty,
        reason,
      })
    );

    if (result?.success) {
      setModalTarget(null);
    }
  }

  async function handleConfirmReleaseReservation() {
    if (!releaseConfirmTarget || !modalTarget) return;

    setReleasing(true);
    try {
      const result = await execute(
        () =>
          releaseInventoryReservationAction({
            reservation_id: releaseConfirmTarget.id,
            inventory_record_id: modalTarget.id,
          }),
        { refresh: true }
      );

      if (result?.success) {
        const releasedQty = releaseConfirmTarget.quantity;
        // Update local modal target and reservation list
        setModalTarget((prev) =>
          prev
            ? {
                ...prev,
                reserved_quantity: Math.max(0, prev.reserved_quantity - releasedQty),
              }
            : null
        );
        setReservations((prev) => prev.filter((r) => r.id !== releaseConfirmTarget.id));
        setReleaseConfirmTarget(null);
      }
    } finally {
      setReleasing(false);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-[var(--kit-shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--kit-border)] bg-[var(--kit-surface)]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">
                Product / Variant
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">
                SKU
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">
                On Hand
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">
                Reserved
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">
                Available
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--kit-border)]">
            {items.map((inv) => {
              const available = inv.on_hand_quantity - inv.reserved_quantity;
              const productName = inv.variant?.product?.name ?? "Unknown product";
              const sku = inv.variant?.sku ?? "—";
              const isLow = available <= 5;
              const isOut = available <= 0;
              const imageUrl =
                inv.variant?.product?.images?.find((img) => img.is_primary)?.url ??
                inv.variant?.product?.images?.[0]?.url ??
                null;

              return (
                <tr key={inv.id} className="hover:bg-[var(--kit-surface)] transition-colors">
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[var(--kit-card)] border border-[var(--kit-border)] flex items-center justify-center text-[var(--kit-text-muted)] shrink-0 overflow-hidden">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageUrl}
                            alt={productName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package size={16} className="text-[var(--kit-text-muted)]" />
                        )}
                      </div>
                      <span className="font-medium text-[var(--kit-text-primary)]">
                        {productName}
                      </span>
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="px-3 py-3 font-mono text-xs text-[var(--kit-text-secondary)]">
                    {sku}
                  </td>

                  {/* On Hand */}
                  <td className="px-3 py-3 text-right font-medium text-[var(--kit-text-primary)]">
                    {inv.on_hand_quantity}
                  </td>

                  {/* Reserved */}
                  <td className="px-3 py-3 text-right text-[var(--kit-text-muted)]">
                    {inv.reserved_quantity}
                  </td>

                  {/* Available */}
                  <td className="px-3 py-3 text-right font-bold text-[var(--kit-text-primary)]">
                    {available}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    {isOut ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--kit-danger)]">
                        <AlertTriangle size={12} /> Out of stock
                      </span>
                    ) : isLow ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--kit-warning)]">
                        <AlertTriangle size={12} /> Low stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--kit-success)]">
                        <CheckCircle size={12} /> In stock
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openAdjustmentModal(inv)}
                      className={clsx(
                        "inline-flex h-8 items-center gap-1.5 rounded-[var(--kit-radius-md)] px-2.5 text-xs font-medium",
                        "border border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-text-secondary)]",
                        "hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
                      )}
                    >
                      {canManage ? (
                        <>
                          <Edit2 size={12} /> Adjust
                        </>
                      ) : (
                        <>
                          <Package size={12} /> View
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Adjustment Modal */}
      {modalTarget && (
        <dialog
          open
          onClose={() => setModalTarget(null)}
          className={clsx(
            "fixed inset-0 z-50 m-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)]",
            "bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-lg)] w-full max-w-lg",
            "backdrop:bg-black/50 max-h-[90vh] overflow-y-auto"
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--kit-text-primary)]">
                {canManage ? "Inventory & Reservation Details" : "Inventory Details (Read-Only)"}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--kit-text-secondary)]">
                {modalTarget.variant?.product?.name} (SKU: {modalTarget.variant?.sku ?? "—"})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalTarget(null)}
              className="rounded-md p-1 text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)]"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Metrics Cards */}
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div className="rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] p-2.5 text-center">
              <span className="block text-[11px] font-medium text-[var(--kit-text-muted)]">
                On Hand
              </span>
              <span className="mt-0.5 block text-lg font-bold text-[var(--kit-text-primary)]">
                {modalTarget.on_hand_quantity}
              </span>
            </div>

            <div className="rounded-[var(--kit-radius-md)] border border-[var(--kit-warning)]/30 bg-[var(--kit-warning)]/10 p-2.5 text-center">
              <span className="block text-[11px] font-medium text-[var(--kit-warning)]">
                Reserved
              </span>
              <span className="mt-0.5 block text-lg font-bold text-[var(--kit-warning)]">
                {modalTarget.reserved_quantity}
              </span>
            </div>

            <div className="rounded-[var(--kit-radius-md)] border border-[var(--kit-success)]/30 bg-[var(--kit-success)]/10 p-2.5 text-center">
              <span className="block text-[11px] font-medium text-[var(--kit-success)]">
                Available
              </span>
              <span className="mt-0.5 block text-lg font-bold text-[var(--kit-success)]">
                {modalTarget.on_hand_quantity - modalTarget.reserved_quantity}
              </span>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-[var(--kit-radius-md)] bg-[var(--kit-danger)]/10 p-2 text-xs text-[var(--kit-danger)]">
              {error}
            </p>
          )}

          {/* Section 1: Physical Stock Level Adjustment */}
          {canManage ? (
            <div className="mt-5 border-t border-[var(--kit-border)] pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--kit-text-muted)]">
                Physical Stock Adjustment
              </h3>

              <form onSubmit={handleSaveAdjustment} className="mt-3 space-y-3">
                <div>
                  <label
                    htmlFor="modal-new-qty-input"
                    className="block text-xs font-medium text-[var(--kit-text-secondary)]"
                  >
                    New Physical On-Hand Quantity
                  </label>
                  <input
                    id="modal-new-qty-input"
                    type="number"
                    min="0"
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    required
                    className={clsx(
                      "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                      "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                      "focus:border-[var(--kit-accent)] focus:outline-none"
                    )}
                  />
                </div>

                <div>
                  <label
                    htmlFor="modal-reason-select"
                    className="block text-xs font-medium text-[var(--kit-text-secondary)]"
                  >
                    Adjustment Reason
                  </label>
                  <select
                    id="modal-reason-select"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className={clsx(
                      "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                      "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                      "focus:border-[var(--kit-accent)] focus:outline-none"
                    )}
                  >
                    <option value="manual_adjustment">Manual Adjustment</option>
                    <option value="stock_received">Stock Received</option>
                    <option value="damaged">Damaged / Written Off</option>
                    <option value="count_correction">Physical Count Correction</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-8 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-3.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {loading ? "Saving…" : "Save On-Hand Level"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="mt-5 border-t border-[var(--kit-border)] pt-4">
              <p className="text-xs text-[var(--kit-text-muted)] italic">
                You have read-only access to inventory. Stock adjustments require the <code>manage_inventory</code> permission.
              </p>
            </div>
          )}

          {/* Section 2: Active Reservations */}
          <div className="mt-6 border-t border-[var(--kit-border)] pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--kit-text-muted)]">
                  Active Reservations ({reservations.length})
                </h3>
                <p className="mt-0.5 text-[11px] text-[var(--kit-text-secondary)]">
                  Releasing a reservation restores quantity to available stock without changing
                  physical on-hand inventory.
                </p>
              </div>
            </div>

            {reservationError && (
              <p className="mt-2 text-xs text-[var(--kit-danger)]">{reservationError}</p>
            )}

            <div className="mt-3 space-y-2">
              {loadingReservations ? (
                <div className="flex items-center justify-center py-6 text-xs text-[var(--kit-text-muted)]">
                  <Loader2 size={16} className="animate-spin mr-2" /> Loading active reservations…
                </div>
              ) : reservations.length === 0 ? (
                <div className="rounded-[var(--kit-radius-md)] border border-dashed border-[var(--kit-border)] bg-[var(--kit-surface)]/50 p-4 text-center text-xs text-[var(--kit-text-muted)]">
                  No active reservations for this item.
                </div>
              ) : (
                reservations.map((res) => {
                  const isExpired = new Date(res.expires_at) < new Date();
                  const createdDate = new Date(res.created_at).toLocaleTimeString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const expiresDate = new Date(res.expires_at).toLocaleTimeString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={res.id}
                      className="flex flex-col gap-2 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[var(--kit-text-primary)]">
                            {res.quantity} {res.quantity === 1 ? "unit" : "units"}
                          </span>
                          <span className="rounded-full bg-[var(--kit-warning)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--kit-warning)] ring-1 ring-inset ring-[var(--kit-warning)]/25">
                            Active
                          </span>
                          {isExpired && (
                            <span className="rounded-full bg-[var(--kit-danger)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--kit-danger)] ring-1 ring-inset ring-[var(--kit-danger)]/25">
                              Expired
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--kit-text-muted)]">
                          {res.checkout_session_id && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              Session: {res.checkout_session_id.slice(0, 8)}…
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Clock size={11} /> Created: {createdDate}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            Expires: {expiresDate}
                          </span>
                        </div>
                      </div>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setReleaseConfirmTarget(res)}
                          disabled={releasing}
                          className={clsx(
                            "inline-flex items-center gap-1 rounded-[var(--kit-radius-md)] px-2.5 py-1 text-xs font-semibold",
                            "border border-[var(--kit-warning)]/40 bg-[var(--kit-warning)]/10 text-[var(--kit-warning)]",
                            "hover:bg-[var(--kit-warning)]/20 active:scale-95 transition-all disabled:opacity-50"
                          )}
                        >
                          <RotateCcw size={12} /> Release
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="mt-6 flex items-center justify-end border-t border-[var(--kit-border)] pt-4">
            <button
              type="button"
              onClick={() => setModalTarget(null)}
              className="h-8 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] px-4 text-xs font-medium text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)]"
            >
              Close
            </button>
          </div>
        </dialog>
      )}

      {/* Confirmation Dialog for Releasing a Reservation */}
      <ConfirmDialog
        open={Boolean(releaseConfirmTarget)}
        onClose={() => setReleaseConfirmTarget(null)}
        onConfirm={handleConfirmReleaseReservation}
        title="Release Reservation?"
        description={
          releaseConfirmTarget && modalTarget
            ? `This will release ${releaseConfirmTarget.quantity} reserved ${
                releaseConfirmTarget.quantity === 1 ? "unit" : "units"
              } back into available stock. Physical on-hand inventory (${
                modalTarget.on_hand_quantity
              }) will not change.`
            : "This will restore reserved inventory back to available stock."
        }
        confirmLabel="Release Reservation"
        cancelLabel="Cancel"
        variant="warning"
        loading={releasing}
      />
    </>
  );
}
