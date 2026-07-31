"use client";

/**
 * components/admin/tables/PromotionsTable.tsx
 *
 * Promotions table displaying active/inactive status toggle, coupon codes, and usage stats.
 * Client Component.
 */

import * as React from "react";
import { Trash2, Tag } from "lucide-react";
import { clsx } from "clsx";

import { useAdmin } from "@/features/admin/hooks/useAdmin";
import { togglePromotionActiveAction, deletePromotionAction } from "@/features/admin/actions/admin.actions";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import type { PromotionWithCoupon } from "@/lib/db/promotions";

interface PromotionsTableProps {
  promotions: PromotionWithCoupon[];
}

function formatDate(iso: string | null): string {
  if (!iso) return "No expiration";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PromotionsTable({ promotions }: PromotionsTableProps) {
  const { execute, loading } = useAdmin();
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  async function handleToggleActive(id: string, currentState: boolean) {
    await execute(() => togglePromotionActiveAction(id, !currentState));
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await execute(() => deletePromotionAction(deleteTarget));
    setDeleteTarget(null);
  }

  return (
    <>
      <div className="overflow-x-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-[var(--kit-shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--kit-border)] bg-[var(--kit-surface)]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Promotion Name</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Coupon Code</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Discount</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Usage</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Expiry</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--kit-border)]">
            {promotions.map((promo) => {
              const coupon = promo.coupon_codes[0];
              const codeStr = coupon?.code ?? "—";
              const usesStr = coupon
                ? `${coupon.current_uses} / ${coupon.max_uses ?? "∞"}`
                : "—";

              const discountValueStr =
                promo.type === "percentage"
                  ? `${promo.value}% OFF`
                  : `₦${(Number(promo.value) / 100).toLocaleString("en-NG")} OFF`;

              return (
                <tr key={promo.id} className="hover:bg-[var(--kit-surface)] transition-colors">
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-[var(--kit-accent)] flex-shrink-0" />
                      <span className="font-medium text-[var(--kit-text-primary)]">{promo.name}</span>
                    </div>
                  </td>

                  {/* Coupon Code */}
                  <td className="px-3 py-3 font-mono font-bold text-xs text-[var(--kit-accent)]">
                    {codeStr}
                  </td>

                  {/* Discount */}
                  <td className="px-3 py-3 font-medium text-[var(--kit-text-primary)]">
                    {discountValueStr}
                  </td>

                  {/* Usage */}
                  <td className="px-3 py-3 text-xs text-[var(--kit-text-secondary)]">{usesStr}</td>

                  {/* Expiry */}
                  <td className="px-3 py-3 text-xs text-[var(--kit-text-muted)]">
                    {formatDate(promo.ends_at)}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    <StatusBadge status={promo.is_active ? "active" : "inactive"} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(promo.id, promo.is_active)}
                        disabled={loading}
                        className={clsx(
                          "rounded-[var(--kit-radius-md)] px-2 py-1 text-xs font-medium border border-[var(--kit-border)]",
                          promo.is_active
                            ? "bg-[var(--kit-surface)] text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)]"
                            : "bg-[var(--kit-success)]/10 text-[var(--kit-success)] border-[var(--kit-success)]/20 hover:bg-[var(--kit-success)]/20"
                        )}
                      >
                        {promo.is_active ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(promo.id)}
                        disabled={loading}
                        className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-danger)] hover:bg-[var(--kit-danger)]/10 transition-colors"
                        title="Delete promotion"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete promotion?"
        description="This will permanently delete the promotion and its associated coupon code."
        confirmLabel="Delete Promotion"
        variant="danger"
        loading={loading}
      />
    </>
  );
}
