"use client";

/**
 * app/(admin)/categories/CategoryManager.tsx
 *
 * Client Component for managing categories (Create, Edit, Archive, Restore).
 */

import * as React from "react";
import { Plus, Edit2, Archive, RotateCcw, FolderOpen } from "lucide-react";
import { clsx } from "clsx";

import { useAdmin } from "@/features/admin/hooks/useAdmin";
import {
  createCategoryAction,
  updateCategoryAction,
  archiveCategoryAction,
  restoreCategoryAction,
} from "@/features/admin/actions/admin.actions";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import type { CategoryRow } from "@/lib/db/categories";

interface CategoryManagerProps {
  initialCategories: CategoryRow[];
}

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const { execute, loading, error } = useAdmin();

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<CategoryRow | null>(null);

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [autoSlug, setAutoSlug] = React.useState(true);
  const [description, setDescription] = React.useState("");
  const [parentId, setParentId] = React.useState("");

  function openCreateModal() {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setAutoSlug(true);
    setDescription("");
    setParentId("");
    setModalOpen(true);
  }

  function openEditModal(cat: CategoryRow) {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setAutoSlug(false);
    setDescription(cat.description ?? "");
    setParentId(cat.parent_id ?? "");
    setModalOpen(true);
  }

  function handleNameChange(val: string) {
    setName(val);
    if (autoSlug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-")
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingCategory) {
      const res = await execute(() =>
        updateCategoryAction({
          id: editingCategory.id,
          name,
          slug,
          description: description || null,
          parent_id: parentId || null,
        })
      );
      if (res?.success) setModalOpen(false);
    } else {
      const res = await execute(() =>
        createCategoryAction({
          name,
          slug,
          description: description || undefined,
          parent_id: parentId || null,
        })
      );
      if (res?.success) setModalOpen(false);
    }
  }

  async function handleArchive(id: string) {
    await execute(() => archiveCategoryAction(id));
  }

  async function handleRestore(id: string) {
    await execute(() => restoreCategoryAction(id));
  }

  return (
    <div className="space-y-4">
      {/* Top action row */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-4 text-xs font-medium text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> New Category
        </button>
      </div>

      {error && (
        <div className="rounded-[var(--kit-radius-md)] border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-3 text-xs text-[var(--kit-danger)]">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-[var(--kit-shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--kit-border)] bg-[var(--kit-surface)]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Category</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Slug</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Parent Category</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--kit-border)]">
            {initialCategories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-[var(--kit-text-muted)]">
                  No categories defined yet.
                </td>
              </tr>
            ) : (
              initialCategories.map((cat) => {
                const parent = initialCategories.find((c) => c.id === cat.parent_id);
                const isArchived = Boolean(cat.archived_at);

                return (
                  <tr key={cat.id} className="hover:bg-[var(--kit-surface)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FolderOpen size={16} className="text-[var(--kit-accent)] flex-shrink-0" />
                        <div>
                          <p className="font-medium text-[var(--kit-text-primary)]">{cat.name}</p>
                          {cat.description && (
                            <p className="text-xs text-[var(--kit-text-muted)] line-clamp-1">{cat.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-[var(--kit-text-secondary)]">{cat.slug}</td>
                    <td className="px-3 py-3 text-xs text-[var(--kit-text-secondary)]">
                      {parent?.name ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={isArchived ? "archived" : "active"} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          title="Edit category"
                          className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>

                        {isArchived ? (
                          <button
                            type="button"
                            onClick={() => handleRestore(cat.id)}
                            disabled={loading}
                            title="Restore category"
                            className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-success)] hover:bg-[var(--kit-success)]/10 transition-colors"
                          >
                            <RotateCcw size={14} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleArchive(cat.id)}
                            disabled={loading}
                            title="Archive category"
                            className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-danger)] hover:bg-[var(--kit-danger)]/10 transition-colors"
                          >
                            <Archive size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <dialog
          open
          onClose={() => setModalOpen(false)}
          className={clsx(
            "fixed inset-0 z-50 m-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)]",
            "bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-lg)] w-full max-w-md",
            "backdrop:bg-black/50"
          )}
        >
          <h2 className="text-base font-semibold text-[var(--kit-text-primary)]">
            {editingCategory ? "Edit Category" : "New Category"}
          </h2>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="cat-name-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                Category Name <span className="text-[var(--kit-danger)]">*</span>
              </label>
              <input
                id="cat-name-input"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="cat-slug-input" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                Slug <span className="text-[var(--kit-danger)]">*</span>
              </label>
              <input
                id="cat-slug-input"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setAutoSlug(false);
                }}
                required
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm font-mono text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div>
              <label htmlFor="cat-parent-select" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Parent Category</label>
              <select
                id="cat-parent-select"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              >
                <option value="">None (Top-Level)</option>
                {initialCategories
                  .filter((c) => c.id !== editingCategory?.id && !c.archived_at)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label htmlFor="cat-desc-textarea" className="block text-xs font-medium text-[var(--kit-text-secondary)]">Description</label>
              <textarea
                id="cat-desc-textarea"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={clsx(
                  "mt-1 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] p-3 text-sm text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-9 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] px-4 text-xs font-medium text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="h-9 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-4 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Saving…" : editingCategory ? "Save Changes" : "Create Category"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
