"use client";

/**
 * app/admin/(protected)/shipping/RateModal.tsx
 *
 * Modal for creating and editing Shipping Rates for a specific Zone and Fulfilment Method.
 */

import * as React from "react";
import { clsx } from "clsx";
import { X, Tag } from "lucide-react";
import type { FulfilmentMethodRow, ShippingRateRow, ShippingZoneRow } from "@/lib/db/shipping";
import { useCurrency } from "@/components/shared/CurrencyProvider";

interface RateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    id?: string;
    zone_id: string;
    fulfilment_method_id: string;
    rate_type: "flat" | "weight_based" | "free_above";
    flat_amount: number;
    per_kg_amount: number;
    free_above_order_total?: number | null;
  }) => Promise<void>;
  zone: ShippingZoneRow | null;
  methods: FulfilmentMethodRow[];
  initialRate?: (ShippingRateRow & { fulfilment_methods?: FulfilmentMethodRow | null }) | null;
  loading?: boolean;
}

export function RateModal({
  open,
  onClose,
  onSubmit,
  zone,
  methods,
  initialRate,
  loading = false,
}: RateModalProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const currency = useCurrency();

  const [methodId, setMethodId] = React.useState(
    initialRate?.fulfilment_method_id ?? methods[0]?.id ?? ""
  );
  const [rateType] = React.useState<"flat" | "weight_based" | "free_above">(
    (initialRate?.rate_type as "flat" | "weight_based" | "free_above") ?? "flat"
  );
  const [flatAmount, setFlatAmount] = React.useState<number>(initialRate?.flat_amount ?? 0);
  const [freeAboveOrderTotal, setFreeAboveOrderTotal] = React.useState<string>(
    initialRate?.free_above_order_total !== null && initialRate?.free_above_order_total !== undefined
      ? String(initialRate.free_above_order_total)
      : ""
  );
  const [error, setError] = React.useState<string | null>(null);

  // Open/close the native <dialog> imperatively when the `open` prop changes.
  // No state is reset here — the parent passes a `key` prop that remounts this
  // component when the editing target changes, so useState initializers re-run.
  React.useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { clientX: x, clientY: y } = e;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      onClose();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!zone) {
      setError("Target shipping zone missing");
      return;
    }
    if (!methodId) {
      setError("Please select a fulfilment method");
      return;
    }
    if (flatAmount < 0) {
      setError("Shipping rate cannot be negative");
      return;
    }

    setError(null);
    try {
      const freeAboveNum = freeAboveOrderTotal.trim() ? Number(freeAboveOrderTotal) : null;
      if (freeAboveNum !== null && (isNaN(freeAboveNum) || freeAboveNum < 0)) {
        setError("Free delivery threshold must be a valid positive number");
        return;
      }

      await onSubmit({
        id: initialRate?.id,
        zone_id: zone.id,
        fulfilment_method_id: methodId,
        rate_type: rateType,
        flat_amount: Number(flatAmount),
        per_kg_amount: 0,
        free_above_order_total: freeAboveNum,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save shipping rate");
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onCancel={onClose}
      className={clsx(
        "m-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)]",
        "bg-[var(--kit-card)] p-0 shadow-[var(--kit-shadow-lg)]",
        "w-full max-w-lg",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm",
        "admin-dialog-enter"
      )}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--kit-border)] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)]/10 text-[var(--kit-accent)]">
              <Tag size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[var(--kit-text-primary)]">
                {initialRate ? "Edit Shipping Rate" : `Add Rate for ${zone?.name ?? "Zone"}`}
              </h2>
              <p className="text-xs text-[var(--kit-text-muted)]">
                Set customer shipping cost for this destination
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-[var(--kit-radius-md)] border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-3 text-xs text-[var(--kit-danger)]">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Fulfilment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider">
              Fulfilment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={methodId}
              disabled={Boolean(initialRate)}
              onChange={(e) => setMethodId(e.target.value)}
              className={clsx(
                "mt-1.5 h-10 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                "bg-[var(--kit-surface)] px-3 text-xs font-medium text-[var(--kit-text-primary)]",
                "focus:border-[var(--kit-accent)] focus:outline-none disabled:opacity-60"
              )}
            >
              {methods.length === 0 && <option value="">No fulfilment methods available</option>}
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.type.replace("_", " ")}) {!m.is_enabled ? "— Disabled" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Shipping Fee / Flat Amount */}
          <div>
            <label className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider">
              Shipping Price / Fee ({currency}) <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <input
                type="number"
                min="0"
                step="any"
                value={flatAmount}
                onChange={(e) => setFlatAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                required
                className={clsx(
                  "h-10 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--kit-text-muted)]">
              Flat fee charged to customer when selecting this option. Set to 0 for Free Delivery.
            </p>
          </div>

          {/* Free Shipping Threshold */}
          <div>
            <label className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider">
              Free Delivery Order Threshold (Optional)
            </label>
            <div className="relative mt-1.5">
              <input
                type="number"
                min="0"
                step="any"
                value={freeAboveOrderTotal}
                onChange={(e) => setFreeAboveOrderTotal(e.target.value)}
                placeholder="e.g. 50000 (Free delivery on orders ₦50,000+)"
                className={clsx(
                  "h-10 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-xs text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none placeholder:text-[var(--kit-text-muted)]"
                )}
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--kit-text-muted)]">
              Leave blank if free delivery threshold does not apply to this method.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--kit-border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] px-4 text-xs font-medium bg-[var(--kit-surface)] text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !methodId}
              className="h-9 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-5 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Saving…" : initialRate ? "Update Rate" : "Add Rate"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
