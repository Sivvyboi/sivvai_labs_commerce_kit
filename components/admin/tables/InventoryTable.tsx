"use client";

/**
 * components/admin/tables/InventoryTable.tsx
 *
 * Inventory management table with inline stock editing and manual adjustment modal.
 * Client Component.
 */

import * as React from "react";
import { Edit2, AlertTriangle, CheckCircle, Package } from "lucide-react";
import { clsx } from "clsx";

import { useAdmin } from "@/features/admin/hooks/useAdmin";
import { updateInventoryAction } from "@/features/admin/actions/inventory.actions";

import type { InventoryWithVariant } from "@/lib/db/inventory";

interface InventoryTableProps {
  items: InventoryWithVariant[];
}

export function InventoryTable({ items }: InventoryTableProps) {
  const { execute, loading, error, clearError } = useAdmin();

  // Manual adjustment modal target
  const [modalTarget, setModalTarget] = React.useState<InventoryWithVariant | null>(null);
  const [newQty, setNewQty] = React.useState<number>(0);
  const [reason, setReason] = React.useState<string>("manual_adjustment");

  function openAdjustmentModal(item: InventoryWithVariant) {
    setModalTarget(item);
    setNewQty(item.on_hand_quantity);
    setReason("manual_adjustment");
    clearError();
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

  return (
    <>
      <div className="overflow-x-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-[var(--kit-shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--kit-border)] bg-[var(--kit-surface)]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Product / Variant</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">SKU</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">On Hand</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">Reserved</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">Available</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--kit-border)]">
            {items.map((inv) => {
              const available = inv.on_hand_quantity - inv.reserved_quantity;
              const productName = inv.variant?.product?.name ?? "Unknown product";
              const sku = inv.variant?.sku ?? "—";
              const isLow = available <= 5;
              const isOut = available <= 0;

              return (
                <tr key={inv.id} className="hover:bg-[var(--kit-surface)] transition-colors">
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Package size={16} className="text-[var(--kit-text-muted)] flex-shrink-0" />
                      <span className="font-medium text-[var(--kit-text-primary)]">{productName}</span>
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="px-3 py-3 font-mono text-xs text-[var(--kit-text-secondary)]">{sku}</td>

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
                      <Edit2 size={12} /> Adjust
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
            "bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-lg)] w-full max-w-md",
            "backdrop:bg-black/50"
          )}
        >
          <h2 className="text-base font-semibold text-[var(--kit-text-primary)]">
            Adjust Inventory Level
          </h2>
          <p className="mt-1 text-xs text-[var(--kit-text-secondary)]">
            {modalTarget.variant?.product?.name} (SKU: {modalTarget.variant?.sku ?? "—"})
          </p>

          {error && (
            <p className="mt-3 rounded-[var(--kit-radius-md)] bg-[var(--kit-danger)]/10 p-2 text-xs text-[var(--kit-danger)]">
              {error}
            </p>
          )}

          <form onSubmit={handleSaveAdjustment} className="mt-4 space-y-4">
            <div>
              <label htmlFor="modal-new-qty-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                New On-Hand Quantity
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
              <label htmlFor="modal-reason-select" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
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

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalTarget(null)}
                className="h-9 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] px-4 text-xs font-medium text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="h-9 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-4 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Saving…" : "Save Adjustment"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
