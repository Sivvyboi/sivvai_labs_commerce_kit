"use client";

/**
 * components/admin/ui/ConfirmDialog.tsx
 *
 * Lightweight confirm modal using the native <dialog> element.
 * Avoids any external dialog library. CSS-animated entrance.
 *
 * Usage:
 *   const [open, setOpen] = React.useState(false);
 *
 *   <ConfirmDialog
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     onConfirm={handleDelete}
 *     title="Archive product?"
 *     description="This will hide the product from the storefront."
 *     confirmLabel="Archive"
 *     variant="danger"
 *   />
 */

import * as React from "react";
import { clsx } from "clsx";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  // Close on backdrop click
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { clientX: x, clientY: y } = e;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      onClose();
    }
  }

  async function handleConfirm() {
    await onConfirm();
    onClose();
  }

  const confirmBtnClass =
    variant === "danger"
      ? "bg-[var(--kit-danger)] text-white hover:opacity-90"
      : variant === "warning"
      ? "bg-[var(--kit-warning)] text-white hover:opacity-90"
      : "bg-[var(--kit-accent)] text-white hover:opacity-90";

  const Icon = variant === "danger" ? Trash2 : AlertTriangle;
  const iconClass =
    variant === "danger"
      ? "bg-[var(--kit-danger)]/10 text-[var(--kit-danger)]"
      : variant === "warning"
      ? "bg-[var(--kit-warning)]/10 text-[var(--kit-warning)]"
      : "bg-[var(--kit-accent)]/10 text-[var(--kit-accent)]";

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onCancel={onClose}
      className={clsx(
        "m-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)]",
        "bg-[var(--kit-card)] p-0 shadow-[var(--kit-shadow-lg)]",
        "w-full max-w-md",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm",
        "admin-dialog-enter"
      )}
    >
      <div className="p-6">
        {/* Icon + Close */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <span className={clsx("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full", iconClass)}>
            <Icon size={20} aria-hidden />
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <h2 className="text-base font-semibold text-[var(--kit-text-primary)]">{title}</h2>
        {description && (
          <p className="mt-1.5 text-sm text-[var(--kit-text-secondary)]">{description}</p>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={clsx(
              "h-9 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] px-4 text-sm font-medium",
              "bg-[var(--kit-surface)] text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] transition-colors",
              "disabled:opacity-50"
            )}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={clsx(
              "h-9 rounded-[var(--kit-radius-md)] px-4 text-sm font-medium transition-opacity",
              confirmBtnClass,
              "disabled:opacity-50"
            )}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
