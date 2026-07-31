/**
 * components/admin/tables/CustomersTable.tsx
 *
 * Customers table for the admin customers list page.
 * Server Component — renders links and profile summary.
 */

import * as React from "react";
import Link from "next/link";
import { Eye, User } from "lucide-react";
import type { CustomerWithAddresses } from "@/lib/db/customers";

interface CustomersTableProps {
  customers: CustomerWithAddresses[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CustomersTable({ customers }: CustomersTableProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-[var(--kit-shadow-sm)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--kit-border)] bg-[var(--kit-surface)]">
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Customer</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Email</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Phone</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Saved Addresses</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Registered</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--kit-border)]">
          {customers.map((c) => {
            const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unnamed Customer";
            const defaultAddress = c.addresses.find((a) => a.is_default) ?? c.addresses[0];

            return (
              <tr key={c.id} className="hover:bg-[var(--kit-surface)] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] flex-shrink-0">
                      <User size={14} />
                    </div>
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="font-medium text-[var(--kit-text-primary)] hover:text-[var(--kit-accent)] transition-colors"
                    >
                      {name}
                    </Link>
                  </div>
                </td>
                <td className="px-3 py-3 text-[var(--kit-text-secondary)]">{c.email}</td>
                <td className="px-3 py-3 text-[var(--kit-text-muted)]">{c.phone ?? "—"}</td>
                <td className="px-3 py-3 text-[var(--kit-text-muted)] text-xs">
                  {c.addresses.length} {c.addresses.length === 1 ? "address" : "addresses"}
                  {defaultAddress && ` (${defaultAddress.city}, ${defaultAddress.state})`}
                </td>
                <td className="px-3 py-3 text-xs text-[var(--kit-text-muted)]">{formatDate(c.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/customers/${c.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors ml-auto"
                    title="View customer details"
                  >
                    <Eye size={14} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
