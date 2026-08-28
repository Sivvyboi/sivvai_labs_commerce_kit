"use client";

/**
 * components/shared/CopyButton.tsx
 *
 * Accessible clipboard copy button with transient feedback.
 * Must be a Client Component — clipboard API is browser-only.
 */

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label = "Copy", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS, Firefox private mode)
      // Silently fail — the user can still manually select & copy
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied!" : `${label}: ${value}`}
      title={copied ? "Copied!" : label}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors min-h-[28px] min-w-[28px]
        ${copied
          ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
          : "bg-[var(--kit-surface)] border border-[var(--kit-border)] text-[var(--kit-muted-fg)] hover:text-[var(--kit-text-primary)] hover:border-[var(--kit-accent)] hover:bg-[var(--kit-accent)]/5"
        } ${className}`}
    >
      {copied ? (
        <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
      ) : (
        <Copy className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{copied ? "Copied!" : label}</span>
    </button>
  );
}
