"use client";

/**
 * app/admin/(protected)/shipping/ZoneModal.tsx
 *
 * Modal for creating and editing Shipping Zones.
 * Supports quick-selection of Nigerian states as well as custom region tags.
 */

import * as React from "react";
import { clsx } from "clsx";
import { X, MapPin, Plus } from "lucide-react";
import type { ShippingZoneRow } from "@/lib/db/shipping";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara", "Nationwide"
];

interface ZoneModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { id?: string; name: string; regions: string[] }) => Promise<void>;
  initialZone?: ShippingZoneRow | null;
  loading?: boolean;
}

export function ZoneModal({
  open,
  onClose,
  onSubmit,
  initialZone,
  loading = false,
}: ZoneModalProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const [name, setName] = React.useState(initialZone?.name ?? "");
  const [regions, setRegions] = React.useState<string[]>(initialZone ? [...initialZone.regions] : []);
  const [customRegion, setCustomRegion] = React.useState("");
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

  function toggleState(stateName: string) {
    if (stateName === "Nationwide") {
      // Toggle nationwide
      if (regions.includes("Nationwide") || regions.includes("*")) {
        setRegions([]);
      } else {
        setRegions(["Nationwide"]);
      }
      return;
    }

    setRegions((prev) => {
      const filtered = prev.filter((r) => r !== "Nationwide" && r !== "*");
      if (filtered.some((r) => r.toLowerCase() === stateName.toLowerCase())) {
        return filtered.filter((r) => r.toLowerCase() !== stateName.toLowerCase());
      } else {
        return [...filtered, stateName];
      }
    });
  }

  function addCustomRegion() {
    const trimmed = customRegion.trim();
    if (!trimmed) return;
    if (!regions.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      setRegions((prev) => [...prev, trimmed]);
    }
    setCustomRegion("");
  }

  function removeRegion(regionName: string) {
    setRegions((prev) => prev.filter((r) => r !== regionName));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Zone name is required");
      return;
    }
    if (regions.length === 0) {
      setError("Please select or enter at least one state/region");
      return;
    }

    setError(null);
    try {
      await onSubmit({
        id: initialZone?.id,
        name: name.trim(),
        regions,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save shipping zone");
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
        "w-full max-w-xl",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm",
        "admin-dialog-enter"
      )}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--kit-border)] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)]/10 text-[var(--kit-accent)]">
              <MapPin size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[var(--kit-text-primary)]">
                {initialZone ? "Edit Shipping Zone" : "New Shipping Zone"}
              </h2>
              <p className="text-xs text-[var(--kit-text-muted)]">
                Define geographic delivery coverage for your store
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
          {/* Zone Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider">
              Zone Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lagos Mainland & Island, Nationwide, South West"
              required
              className={clsx(
                "mt-1.5 h-10 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                "focus:border-[var(--kit-accent)] focus:outline-none placeholder:text-[var(--kit-text-muted)]"
              )}
            />
          </div>

          {/* Selected Regions Tags */}
          <div>
            <label className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider">
              Geographic Coverage ({regions.length} selected) <span className="text-red-500">*</span>
            </label>

            {regions.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5 p-2 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] max-h-28 overflow-y-auto">
                {regions.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--kit-accent)]/10 px-2.5 py-1 text-xs font-medium text-[var(--kit-accent)]"
                  >
                    {r}
                    <button
                      type="button"
                      onClick={() => removeRegion(r)}
                      className="hover:text-[var(--kit-danger)] transition-colors ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-[var(--kit-text-muted)]">
                No regions selected yet. Choose from the quick list below or enter custom areas.
              </p>
            )}
          </div>

          {/* Quick State Selectors */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--kit-text-muted)]">
              Quick State / Region Selector
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]/60 bg-[var(--kit-surface)]/50">
              {NIGERIAN_STATES.map((st) => {
                const isSelected = regions.some((r) => r.toLowerCase() === st.toLowerCase());
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => toggleState(st)}
                    className={clsx(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                      isSelected
                        ? "bg-[var(--kit-accent)] text-white shadow-xs"
                        : "bg-[var(--kit-card)] border border-[var(--kit-border)] text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)]"
                    )}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Region Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customRegion}
              onChange={(e) => setCustomRegion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomRegion();
                }
              }}
              placeholder="Or enter custom region / city / district..."
              className={clsx(
                "h-9 flex-1 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                "bg-[var(--kit-surface)] px-3 text-xs text-[var(--kit-text-primary)]",
                "focus:border-[var(--kit-accent)] focus:outline-none placeholder:text-[var(--kit-text-muted)]"
              )}
            />
            <button
              type="button"
              onClick={addCustomRegion}
              className="h-9 px-3 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] text-xs font-medium text-[var(--kit-text-primary)] hover:bg-[var(--kit-muted)] flex items-center gap-1"
            >
              <Plus size={14} /> Add
            </button>
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
              disabled={loading || !name.trim() || regions.length === 0}
              className="h-9 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-5 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Saving…" : initialZone ? "Update Zone" : "Create Zone"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
