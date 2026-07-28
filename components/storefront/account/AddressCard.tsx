"use client";

import type { CustomerAddressRow } from "@/lib/db/customers";
import { MapPin, Edit3, Trash2, CheckCircle2 } from "lucide-react";

interface AddressCardProps {
  address: CustomerAddressRow;
  onEdit: (address: CustomerAddressRow) => void;
  onDelete: (addressId: string) => void;
  onSetDefault: (addressId: string) => void;
  isDeleting?: boolean;
}

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  isDeleting,
}: AddressCardProps) {
  return (
    <div className="flex flex-col justify-between p-5 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] space-y-4 shadow-sm hover:border-[var(--kit-accent)] transition-colors">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[var(--kit-accent)] shrink-0" />
            <h4 className="font-semibold text-sm text-[var(--kit-text-primary)]">
              {address.label}
            </h4>
          </div>
          {address.is_default && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
              <CheckCircle2 className="h-3 w-3" /> Default
            </span>
          )}
        </div>

        <div className="text-xs text-[var(--kit-muted-fg)] leading-relaxed space-y-0.5 pl-6">
          <p>{address.street_line_1}</p>
          {address.street_line_2 && <p>{address.street_line_2}</p>}
          <p>
            {address.city}, {address.state}
          </p>
          <p className="font-medium text-[var(--kit-text-primary)]">{address.country}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[var(--kit-border)] text-xs">
        {!address.is_default ? (
          <button
            type="button"
            onClick={() => onSetDefault(address.id)}
            className="text-[var(--kit-accent)] font-semibold hover:underline min-h-[36px] flex items-center"
          >
            Set as Default
          </button>
        ) : (
          <span className="text-[11px] text-[var(--kit-muted-fg)]">Default address</span>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onEdit(address)}
            className="inline-flex items-center gap-1 text-[var(--kit-muted-fg)] hover:text-[var(--kit-text-primary)] transition-colors min-h-[36px] px-1"
          >
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onDelete(address.id)}
            className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 dark:text-rose-400 transition-colors min-h-[36px] px-1 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
