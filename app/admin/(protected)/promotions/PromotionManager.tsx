"use client";

/**
 * app/(admin)/promotions/PromotionManager.tsx
 *
 * Client Component for managing promotions and creating coupon codes.
 */

import * as React from "react";
import { Plus } from "lucide-react";
import { clsx } from "clsx";

import { useAdmin } from "@/features/admin/hooks/useAdmin";
import { createPromotionAction } from "@/features/admin/actions/promotion.actions";

import { PromotionsTable } from "@/components/admin/tables/PromotionsTable";
import type { PromotionWithCoupon } from "@/lib/db/promotions";

interface PromotionManagerProps {
  promotions: PromotionWithCoupon[];
}

export function PromotionManager({ promotions }: PromotionManagerProps) {
  const { execute, loading, error, clearError } = useAdmin();

  const [modalOpen, setModalOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"percentage" | "fixed_amount">("percentage");
  const [value, setValue] = React.useState("");
  const [code, setCode] = React.useState("");
  const [maxUses, setMaxUses] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");

  function openCreateModal() {
    clearError();
    setName("");
    setType("percentage");
    setValue("");
    setCode("");
    setMaxUses("");
    setEndsAt("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // If type is fixed_amount, convert NGN input to kobo
    const numericValue =
      type === "fixed_amount" ? Math.round(Number(value) * 100) : Number(value);

    const res = await execute(() =>
      createPromotionAction({
        name,
        type,
        value: numericValue,
        code,
        max_uses: maxUses ? Number(maxUses) : null,
        ends_at: endsAt || null,
        is_active: true,
      })
    );

    if (res?.success) {
      setModalOpen(false);
      setName("");
      setValue("");
      setCode("");
      setMaxUses("");
      setEndsAt("");
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Action Row */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-4 text-xs font-medium text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> New Promotion
        </button>
      </div>

      {error && !modalOpen && (
        <div className="rounded-[var(--kit-radius-md)] border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-3 text-xs text-[var(--kit-danger)]">
          {error}
        </div>
      )}

      {/* Table or Empty */}
      {promotions.length === 0 ? (
        <div className="rounded-[var(--kit-radius-lg)] border border-dashed border-[var(--kit-border)] bg-[var(--kit-surface)] p-12 text-center text-xs text-[var(--kit-text-muted)]">
          No promotions or coupon codes created yet.
        </div>
      ) : (
        <PromotionsTable promotions={promotions} />
      )}

      {/* Create Promotion Modal */}
      {modalOpen && (
        <dialog
          open
          onClose={() => setModalOpen(false)}
          className={clsx(
            "fixed inset-0 z-50 m-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)]",
            "bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-lg)] w-full max-w-md",
            "backdrop:bg-black/50"
          )}
        >
          <h2 className="text-base font-semibold text-[var(--kit-text-primary)]">
            New Promotion & Coupon Code
          </h2>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="rounded-[var(--kit-radius-md)] border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-3 text-xs text-[var(--kit-danger)]">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="promo-name-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                Promotion Name <span className="text-[var(--kit-danger)]">*</span>
              </label>
              <input
                id="promo-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Summer Flash Sale"
                required
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="promo-code-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                Coupon Code <span className="text-[var(--kit-danger)]">*</span>
              </label>
              <input
                id="promo-code-input"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SUMMER15"
                required
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm font-mono uppercase text-[var(--kit-accent)] font-bold",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="promo-type-select" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Discount Type</label>
                <select
                  id="promo-type-select"
                  value={type}
                  onChange={(e) => setType(e.target.value as "percentage" | "fixed_amount")}
                  className={clsx(
                    "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                    "bg-[var(--kit-surface)] px-3 text-xs text-[var(--kit-text-primary)]",
                    "focus:border-[var(--kit-accent)] focus:outline-none"
                  )}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed_amount">Fixed Amount (₦)</option>
                </select>
              </div>

              <div>
                <label htmlFor="promo-value-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                  Value ({type === "percentage" ? "%" : "₦"}) <span className="text-[var(--kit-danger)]">*</span>
                </label>
                <input
                  id="promo-value-input"
                  type="number"
                  step={type === "percentage" ? "1" : "0.01"}
                  min={type === "percentage" ? "1" : "0.01"}
                  max={type === "percentage" ? "100" : undefined}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === "percentage" ? "15" : "1000"}
                  required
                  className={clsx(
                    "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                    "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                    "focus:border-[var(--kit-accent)] focus:outline-none"
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="promo-maxuses-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Max Usage Limit</label>
                <input
                  id="promo-maxuses-input"
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Unlimited"
                  className={clsx(
                    "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                    "bg-[var(--kit-surface)] px-3 text-xs text-[var(--kit-text-primary)]",
                    "focus:border-[var(--kit-accent)] focus:outline-none"
                  )}
                />
              </div>

              <div>
                <label htmlFor="promo-endsat-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Expiry Date</label>
                <input
                  id="promo-endsat-input"
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className={clsx(
                    "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                    "bg-[var(--kit-surface)] px-3 text-xs text-[var(--kit-text-primary)]",
                    "focus:border-[var(--kit-accent)] focus:outline-none"
                  )}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-9 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] px-4 text-xs font-medium text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="h-9 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-4 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Creating…" : "Create Promotion"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
