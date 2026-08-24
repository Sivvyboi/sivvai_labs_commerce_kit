"use client";

/**
 * app/admin/(protected)/shipping/MethodModal.tsx
 *
 * Modal for creating and editing Fulfilment Methods.
 */

import * as React from "react";
import { clsx } from "clsx";
import { X, Truck } from "lucide-react";
import type { FulfilmentMethodRow } from "@/lib/db/shipping";

interface MethodModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    id?: string;
    type: "pickup" | "local_delivery" | "courier";
    name: string;
    description?: string | null;
    is_enabled: boolean;
    estimated_days_min: number;
    estimated_days_max: number;
  }) => Promise<void>;
  initialMethod?: FulfilmentMethodRow | null;
  loading?: boolean;
}

export function MethodModal({
  open,
  onClose,
  onSubmit,
  initialMethod,
  loading = false,
}: MethodModalProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const [name, setName] = React.useState(initialMethod?.name ?? "");
  const [type, setType] = React.useState<"pickup" | "local_delivery" | "courier">(
    (initialMethod?.type as "pickup" | "local_delivery" | "courier") ?? "courier"
  );
  const [description, setDescription] = React.useState(initialMethod?.description ?? "");
  const [isEnabled, setIsEnabled] = React.useState(initialMethod?.is_enabled ?? true);
  const [estimatedDaysMin, setEstimatedDaysMin] = React.useState(initialMethod?.estimated_days_min ?? 1);
  const [estimatedDaysMax, setEstimatedDaysMax] = React.useState(initialMethod?.estimated_days_max ?? 5);
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
    if (!name.trim()) {
      setError("Method name is required");
      return;
    }
    if (estimatedDaysMin < 0 || estimatedDaysMax < 0) {
      setError("Delivery days cannot be negative");
      return;
    }
    if (estimatedDaysMax < estimatedDaysMin) {
      setError("Maximum estimated days cannot be less than minimum estimated days");
      return;
    }

    setError(null);
    try {
      await onSubmit({
        id: initialMethod?.id,
        name: name.trim(),
        type,
        description: description.trim() || null,
        is_enabled: isEnabled,
        estimated_days_min: Number(estimatedDaysMin),
        estimated_days_max: Number(estimatedDaysMax),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save fulfilment method");
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
              <Truck size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[var(--kit-text-primary)]">
                {initialMethod ? "Edit Fulfilment Method" : "New Fulfilment Method"}
              </h2>
              <p className="text-xs text-[var(--kit-text-muted)]">
                Define a shipping or pickup option available to customers
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
          {/* Method Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider">
              Method Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Courier Delivery, Express Next-Day, Store Pickup"
              required
              className={clsx(
                "mt-1.5 h-10 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                "focus:border-[var(--kit-accent)] focus:outline-none placeholder:text-[var(--kit-text-muted)]"
              )}
            />
          </div>

          {/* Fulfilment Type */}
          <div>
            <label className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider">
              Fulfilment Type <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "pickup" | "local_delivery" | "courier")}
              className={clsx(
                "mt-1.5 h-10 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                "bg-[var(--kit-surface)] px-3 text-xs font-medium text-[var(--kit-text-primary)]",
                "focus:border-[var(--kit-accent)] focus:outline-none"
              )}
            >
              <option value="courier">Courier (Interstate / National dispatch)</option>
              <option value="local_delivery">Local Delivery (Direct dispatch rider)</option>
              <option value="pickup">Store Pickup (Customer collects at location)</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider">
              Customer Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Dispatched via DHL/GIG Logistics. Tracking number provided on dispatch."
              className={clsx(
                "mt-1.5 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                "bg-[var(--kit-surface)] p-3 text-xs text-[var(--kit-text-primary)]",
                "focus:border-[var(--kit-accent)] focus:outline-none placeholder:text-[var(--kit-text-muted)]"
              )}
            />
          </div>

          {/* Delivery Estimation Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider">
                Min Days
              </label>
              <input
                type="number"
                min="0"
                value={estimatedDaysMin}
                onChange={(e) => setEstimatedDaysMin(parseInt(e.target.value) || 0)}
                className={clsx(
                  "mt-1.5 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-xs text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider">
                Max Days
              </label>
              <input
                type="number"
                min="0"
                value={estimatedDaysMax}
                onChange={(e) => setEstimatedDaysMax(parseInt(e.target.value) || 0)}
                className={clsx(
                  "mt-1.5 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-xs text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>
          </div>

          {/* Active Status Switch */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-medium text-[var(--kit-text-primary)]">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--kit-border)] text-[var(--kit-accent)] focus:ring-[var(--kit-accent)]"
              />
              <span>Enable this fulfilment method for checkout</span>
            </label>
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
              disabled={loading || !name.trim()}
              className="h-9 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-5 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Saving…" : initialMethod ? "Update Method" : "Create Method"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
