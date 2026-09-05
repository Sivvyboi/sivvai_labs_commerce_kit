"use client";

/**
 * components/admin/tables/AuditLogsTable.tsx
 *
 * Client Component for rendering immutable system and admin security audit logs.
 * Displays Actor, Action, Entity, Entity ID, Timestamp, IP Address, User Agent,
 * and allows inspecting JSON metadata payloads.
 */

import React, { useState } from "react";
import type { AuditLogRow } from "@/features/admin/actions/audit.actions";
import { clsx } from "clsx";
import {
  Shield,
  User,
  Globe,
  Clock,
  Code,
  X,
  Copy,
  Check,
  Activity,
  Terminal,
} from "lucide-react";

interface AuditLogsTableProps {
  logs: AuditLogRow[];
}

export function AuditLogsTable({ logs }: AuditLogsTableProps) {
  const [selectedMetadata, setSelectedMetadata] = useState<{
    action: string;
    id: string;
    metadata: Record<string, unknown> | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyJson = () => {
    if (!selectedMetadata?.metadata) return;
    navigator.clipboard.writeText(JSON.stringify(selectedMetadata.metadata, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes("delete") || action.includes("deactivate") || action.includes("archive")) {
      return "bg-[var(--kit-danger)]/15 text-[var(--kit-danger)] border-[var(--kit-danger)]/30";
    }
    if (action.includes("create") || action.includes("invite") || action.includes("reactivate")) {
      return "bg-[var(--kit-success)]/15 text-[var(--kit-success)] border-[var(--kit-success)]/30";
    }
    if (action.includes("update") || action.includes("role") || action.includes("adjust")) {
      return "bg-[var(--kit-warning)]/15 text-[var(--kit-warning)] border-[var(--kit-warning)]/30";
    }
    return "bg-[var(--kit-surface)] text-[var(--kit-text-secondary)] border-[var(--kit-border)]";
  };

  if (logs.length === 0) {
    return (
      <div className="rounded-[var(--kit-radius-lg)] border border-dashed border-[var(--kit-border)] bg-[var(--kit-surface)] p-12 text-center">
        <Activity size={32} className="mx-auto text-[var(--kit-text-muted)] mb-3" />
        <h3 className="text-sm font-semibold text-[var(--kit-text-primary)]">No audit events recorded</h3>
        <p className="mt-1 text-xs text-[var(--kit-text-muted)]">
          Audit events are logged automatically as administrative actions take place.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-[var(--kit-shadow-sm)]">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-text-muted)] font-medium">
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Network &amp; Client</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--kit-border)] text-[var(--kit-text-primary)]">
            {logs.map((log) => {
              const formattedDate = new Date(log.created_at).toLocaleString([], {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <tr key={log.id} className="hover:bg-[var(--kit-surface)]/60 transition-colors">
                  {/* Timestamp */}
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--kit-text-muted)] font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-[var(--kit-text-muted)]" />
                      <span>{formattedDate}</span>
                    </div>
                  </td>

                  {/* Actor */}
                  <td className="px-4 py-3">
                    {log.actor ? (
                      <div>
                        <div className="font-medium text-[var(--kit-text-primary)] flex items-center gap-1">
                          <User size={12} className="text-[var(--kit-text-muted)]" />
                          <span>{log.actor.email}</span>
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.2 rounded border bg-[var(--kit-surface)] text-[var(--kit-text-secondary)] border-[var(--kit-border)]">
                          {log.actor.roleName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[var(--kit-text-muted)] italic">
                        {log.admin_user_id ? `Admin (${log.admin_user_id.slice(0, 8)}…)` : "System / Automated"}
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium border",
                        getActionBadgeClass(log.action)
                      )}
                    >
                      <Terminal size={10} />
                      {log.action}
                    </span>
                  </td>

                  {/* Entity & ID */}
                  <td className="px-4 py-3">
                    {log.entity_type ? (
                      <div>
                        <span className="font-medium text-[var(--kit-text-primary)] uppercase text-[10px] tracking-wider">
                          {log.entity_type}
                        </span>
                        {log.entity_id && (
                          <div className="text-[11px] font-mono text-[var(--kit-text-muted)] truncate max-w-[140px]" title={log.entity_id}>
                            {log.entity_id}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--kit-text-muted)]">—</span>
                    )}
                  </td>

                  {/* Network / Client */}
                  <td className="px-4 py-3 text-[11px] text-[var(--kit-text-muted)] max-w-[200px]">
                    <div className="flex items-center gap-1">
                      <Globe size={11} />
                      <span className="font-mono">{log.ip_address || "Unknown IP"}</span>
                    </div>
                    {log.user_agent && (
                      <div className="truncate text-[10px] text-[var(--kit-text-muted)] mt-0.5" title={log.user_agent}>
                        {log.user_agent}
                      </div>
                    )}
                  </td>

                  {/* Details / Payload */}
                  <td className="px-4 py-3 text-right">
                    {log.metadata && Object.keys(log.metadata).length > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMetadata({
                            action: log.action,
                            id: log.id,
                            metadata: log.metadata,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium border border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-text-secondary)] hover:text-[var(--kit-text-primary)] hover:bg-[var(--kit-muted)] transition-colors"
                      >
                        <Code size={11} />
                        Metadata
                      </button>
                    ) : (
                      <span className="text-[11px] text-[var(--kit-text-muted)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Metadata Modal */}
      {selectedMetadata && (
        <dialog
          open
          onClose={() => setSelectedMetadata(null)}
          className={clsx(
            "fixed inset-0 z-50 m-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)]",
            "bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-lg)] w-full max-w-xl",
            "backdrop:bg-black/50 max-h-[85vh] flex flex-col"
          )}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--kit-border)]">
            <div>
              <h3 className="text-sm font-semibold text-[var(--kit-text-primary)] flex items-center gap-1.5">
                <Shield size={14} className="text-[var(--kit-accent)]" />
                Audit Event Metadata
              </h3>
              <p className="text-xs text-[var(--kit-text-muted)] font-mono mt-0.5">
                {selectedMetadata.action} · {selectedMetadata.id.slice(0, 8)}…
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMetadata(null)}
              className="p-1 rounded text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)] hover:bg-[var(--kit-muted)]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="relative mt-4 flex-1 overflow-auto rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] p-3">
            <button
              type="button"
              onClick={handleCopyJson}
              className="absolute top-2 right-2 flex items-center gap-1 rounded bg-[var(--kit-card)] px-2 py-1 text-[10px] font-medium border border-[var(--kit-border)] text-[var(--kit-text-secondary)] hover:text-[var(--kit-text-primary)]"
            >
              {copied ? <Check size={11} className="text-[var(--kit-success)]" /> : <Copy size={11} />}
              {copied ? "Copied" : "Copy JSON"}
            </button>
            <pre className="text-xs font-mono text-[var(--kit-text-primary)] overflow-x-auto">
              {JSON.stringify(selectedMetadata.metadata, null, 2)}
            </pre>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setSelectedMetadata(null)}
              className="rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] px-3 py-1.5 text-xs font-medium text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)]"
            >
              Close
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
