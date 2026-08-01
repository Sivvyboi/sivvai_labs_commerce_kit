/**
 * app/(admin)/customers/page.tsx
 *
 * Admin Customers List — Server Component.
 * Supports search (?q=) and pagination.
 */

import * as React from "react";
import type { Metadata } from "next";

import { getAllCustomers } from "@/services/customer-service";
import { CustomersTable } from "@/components/admin/tables/CustomersTable";
import { AdminSearch } from "@/components/admin/ui/AdminSearch";
import { Pagination } from "@/components/admin/ui/Pagination";
import { EmptyAdminState } from "@/components/admin/ui/EmptyAdminState";

export const metadata: Metadata = {
  title: "Customers",
};

interface AdminCustomersPageProps {
  searchParams: Promise<{
    q?: string;
    offset?: string;
  }>;
}

export default async function AdminCustomersPage({ searchParams }: AdminCustomersPageProps) {
  const params = await searchParams;
  const search = params.q;
  const offset = Number(params.offset ?? 0);
  const limit = 20;

  const { data: customers, count } = await getAllCustomers({
    search,
    offset,
    limit,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--kit-text-primary)]">Customers</h1>
        <p className="mt-0.5 text-sm text-[var(--kit-text-secondary)]">
          Manage registered customer profiles ({count} total)
        </p>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminSearch placeholder="Search customers by name or email…" className="sm:w-80" />
      </div>

      {/* Table or Empty State */}
      {customers.length === 0 ? (
        <EmptyAdminState
          title="No customers found"
          description={search ? `No customer profiles matching "${search}"` : "Registered customer accounts will appear here."}
        />
      ) : (
        <>
          <CustomersTable customers={customers} />
          <Pagination
            total={count}
            limit={limit}
            offset={offset}
            basePath="/admin/customers"
            searchParams={{ q: search }}
          />
        </>
      )}
    </div>
  );
}
