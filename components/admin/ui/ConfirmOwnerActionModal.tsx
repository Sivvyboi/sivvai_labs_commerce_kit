"use client";

/**
 * components/admin/ui/ConfirmOwnerActionModal.tsx
 *
 * Two-Step Confirmation Modal for Sensitive Owner Role Changes & Deactivations.
 * Requires:
 *  1. Typing expected verification string (e.g. "REMOVE OWNER", "PROMOTE OWNER", "DEACTIVATE OWNER")
 *  2. Current Owner Password re-authentication
 *  3. Optional Audit Log Reason
 */

import React, { useState } from "react";
import { AlertTriangle, Lock, X } from "lucide-react";
import { clsx } from "clsx";

interface ConfirmOwnerActionModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  expectedVerificationText: string;
  onConfirm: (password: string, reason: string) => Promise<{ success: boolean; error?: string }>;
}

export function ConfirmOwnerActionModal({
  open,
  onClose,
  title,
  description,
  expectedVerificationText,
  onConfirm,
}: ConfirmOwnerActionModalProps) {
  const [verificationInput, setVerificationInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const isMatched = verificationInput.trim() === expectedVerificationText;
  const canSubmit = isMatched && passwordInput.length > 0 && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await onConfirm(passwordInput, reasonInput);
      if (!result.success) {
        setError(result.error || "Action failed.");
        setIsSubmitting(false);
      } else {
        setIsSubmitting(false);
        handleClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setVerificationInput("");
    setPasswordInput("");
    setReasonInput("");
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--kit-danger)]/10 text-[var(--kit-danger)] border border-[var(--kit-danger)]/20">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--kit-fg)]">{title}</h3>
              <p className="text-[11px] text-[var(--kit-muted-fg)]">High-privilege security verification</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-[var(--kit-muted-fg)] hover:text-[var(--kit-fg)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning description */}
        <p className="text-xs text-[var(--kit-muted-fg)] leading-relaxed bg-[var(--kit-bg)] p-3 rounded-lg border border-[var(--kit-border)]">
          {description}
        </p>

        {error && (
          <div className="rounded-lg bg-[var(--kit-danger)]/10 p-3 text-xs text-[var(--kit-danger)] border border-[var(--kit-danger)]/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Verification Text */}
          <div>
            <label className="block text-xs font-medium text-[var(--kit-fg)] mb-1">
              Type <code className="font-mono text-[var(--kit-danger)] font-bold">{expectedVerificationText}</code> to confirm
            </label>
            <input
              type="text"
              required
              value={verificationInput}
              onChange={(e) => setVerificationInput(e.target.value)}
              placeholder={expectedVerificationText}
              className="w-full rounded-lg border border-[var(--kit-border)] bg-[var(--kit-bg)] px-3 py-2 text-xs font-mono text-[var(--kit-fg)] placeholder-[var(--kit-muted-fg)] focus:border-[var(--kit-primary)] focus:outline-none"
            />
          </div>

          {/* Step 2: Password Re-Authentication */}
          <div>
            <label className="block text-xs font-medium text-[var(--kit-fg)] mb-1 flex items-center gap-1">
              <Lock size={12} className="text-[var(--kit-muted-fg)]" />
              Re-enter Your Owner Password
            </label>
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-[var(--kit-border)] bg-[var(--kit-bg)] px-3 py-2 text-xs text-[var(--kit-fg)] placeholder-[var(--kit-muted-fg)] focus:border-[var(--kit-primary)] focus:outline-none"
            />
          </div>

          {/* Step 3: Optional Reason */}
          <div>
            <label className="block text-xs font-medium text-[var(--kit-muted-fg)] mb-1">
              Reason for Audit Log (optional)
            </label>
            <input
              type="text"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="e.g. Role update requested by management"
              className="w-full rounded-lg border border-[var(--kit-border)] bg-[var(--kit-bg)] px-3 py-2 text-xs text-[var(--kit-fg)] placeholder-[var(--kit-muted-fg)] focus:border-[var(--kit-primary)] focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-[var(--kit-border)] px-3.5 py-2 text-xs font-medium text-[var(--kit-fg)] hover:bg-[var(--kit-bg)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={clsx(
                "rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors disabled:opacity-50",
                expectedVerificationText.includes("REMOVE") || expectedVerificationText.includes("DEACTIVATE")
                  ? "bg-[var(--kit-danger)] hover:bg-[var(--kit-danger)]/90"
                  : "bg-[var(--kit-primary)] hover:bg-[var(--kit-primary)]/90"
              )}
            >
              {isSubmitting ? "Verifying..." : "Confirm & Apply"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
