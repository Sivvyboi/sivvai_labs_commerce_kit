/**
 * app/admin/(protected)/products/archived/page.tsx
 *
 * Archived Products Management — Server Component.
 * Lists products where status = 'archived' and deleted_at IS NULL.
 * Allows merchants to restore products or permanently delete them from the catalog.
 */

import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Archive } from "lucide-react";
import { clsx } from "clsx";

import { requirePermissionPage } from "@/lib/auth/admin-guard";
import { getAllProducts } from "@/services/product-service";
import { ArchivedProductsTable } from "@/components/admin/tables/ArchivedProductsTable";
import { AdminSearch } from "@/components/admin/ui/AdminSearch";
import { Pagination } from "@/components/admin/ui/Pagination";
import { EmptyAdminState } from "@/components/admin/ui/EmptyAdminState";

export const metadata: Metadata = {
  title: "Archived Products",
};

interface ArchivedProductsPageProps {
  searchParams: Promise<{
    q?: string;
    offset?: string;
  }>;
}

export default async function ArchivedProductsPage({ searchParams }: ArchivedProductsPageProps) {
  const ctx = await requirePermissionPage("view_products");
  const canManage = ctx.permissions.includes("manage_products");
  const params = await searchParams;
  const search = params.q;
  const offset = Number(params.offset ?? 0);
  const limit = 20;

  const { data: products, count } = await getAllProducts({
    search,
    status: "archived",
    offset,
    limit,
  });

  return (
    <div className="space-y-6">
      {/* Back button and Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1 text-xs text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
            >
              <ArrowLeft size={13} />
              Back to active products
            </Link>
          </div>
          <h1 className="text-xl font-bold text-[var(--kit-text-primary)] flex items-center gap-2">
            <Archive size={20} className="text-[var(--kit-text-muted)]" />
            Archived Products
          </h1>
          <p className="text-sm text-[var(--kit-text-secondary)]">
            Products removed from your live store. Restore them or permanently delete them from the catalog ({count} total).
          </p>
        </div>
      </div>

      {/* Filter / Search row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminSearch placeholder="Search archived products…" className="sm:w-72" />
      </div>

      {/* Table or Empty state */}
      {products.length === 0 ? (
        <EmptyAdminState
          title="No archived products"
          description={
            search
              ? `No archived products match "${search}"`
              : "When you archive products from your main catalog, they will appear here."
          }
          action={{ label: "Back to Products", href: "/admin/products" }}
        />
      ) : (
        <>
          <ArchivedProductsTable products={products} canManage={canManage} />
          <Pagination
            total={count}
            limit={limit}
            offset={offset}
            basePath="/admin/products/archived"
            searchParams={{ q: search }}
          />
        </>
      )}
    </div>
  );
}
