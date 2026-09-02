/**
 * app/(admin)/products/page.tsx
 *
 * Admin Products List — Server Component.
 * Supports search (?q=), status filter (?status=), and pagination.
 * Excludes archived products from this view (managed under /admin/products/archived).
 */

import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Archive } from "lucide-react";
import { clsx } from "clsx";

import { requirePermissionPage } from "@/lib/auth/admin-guard";
import { getAllProducts } from "@/services/product-service";
import { ProductsTable } from "@/components/admin/tables/ProductsTable";
import { AdminSearch } from "@/components/admin/ui/AdminSearch";
import { Pagination } from "@/components/admin/ui/Pagination";
import { EmptyAdminState } from "@/components/admin/ui/EmptyAdminState";

export const metadata: Metadata = {
  title: "Products",
};

interface AdminProductsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    offset?: string;
  }>;
}

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  await requirePermissionPage("manage_products");
  const params = await searchParams;
  const search = params.q;
  const status = params.status && params.status !== "all" ? params.status : undefined;
  const offset = Number(params.offset ?? 0);
  const limit = 20;

  const { data: products, count } = await getAllProducts({
    search,
    status,
    excludeArchived: !status, // If viewing all on main products page, exclude archived
    offset,
    limit,
  });

  const statuses = [
    { label: "All Active", value: "all" },
    { label: "Published", value: "published" },
    { label: "Draft", value: "draft" },
  ];

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--kit-text-primary)]">Products</h1>
          <p className="mt-0.5 text-sm text-[var(--kit-text-secondary)]">
            Manage your store catalog ({count} active)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            id="admin-archived-products-btn"
            href="/admin/products/archived"
            className={clsx(
              "inline-flex h-9 items-center gap-1.5 rounded-[var(--kit-radius-md)] px-3 text-xs font-medium",
              "border border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-text-secondary)] hover:text-[var(--kit-text-primary)] hover:bg-[var(--kit-card)] transition-colors"
            )}
          >
            <Archive size={14} /> Archived Products
          </Link>

          <Link
            id="admin-new-product-btn"
            href="/admin/products/new"
            className={clsx(
              "inline-flex h-9 items-center gap-1.5 rounded-[var(--kit-radius-md)] px-4 text-sm font-medium",
              "bg-[var(--kit-accent)] text-white hover:opacity-90 transition-opacity"
            )}
          >
            <Plus size={16} /> New Product
          </Link>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminSearch placeholder="Search products by name…" className="sm:w-72" />

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] p-1">
          {statuses.map((s) => {
            const isActive = (params.status ?? "all") === s.value;
            const href = s.value === "all" ? "/admin/products" : `/admin/products?status=${s.value}`;

            return (
              <Link
                key={s.value}
                href={href}
                className={clsx(
                  "rounded-[var(--kit-radius-sm)] px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-[var(--kit-card)] text-[var(--kit-text-primary)] shadow-[var(--kit-shadow-sm)]"
                    : "text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)]"
                )}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Table or Empty state */}
      {products.length === 0 ? (
        <EmptyAdminState
          title="No products found"
          description={search ? `No results for "${search}"` : "Get started by adding your first product."}
          action={search ? undefined : { label: "Create Product", href: "/admin/products/new" }}
        />
      ) : (
        <>
          <ProductsTable products={products} />
          <Pagination
            total={count}
            limit={limit}
            offset={offset}
            basePath="/admin/products"
            searchParams={{ q: search, status: params.status }}
          />
        </>
      )}
    </div>
  );
}
