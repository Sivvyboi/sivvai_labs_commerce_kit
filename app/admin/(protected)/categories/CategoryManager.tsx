"use client";

/**
 * app/(admin)/categories/CategoryManager.tsx
 *
 * Client Component for managing categories.
 * Active categories and archived categories are shown in separate tabs.
 * Archiving a row removes it from the Active tab immediately;
 * restoring moves it back.
 */

import * as React from "react";
import Image from "next/image";
import {
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  FolderOpen,
  Camera,
  Trash2,
  Upload,
  X,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";

import { useAdmin } from "@/features/admin/hooks/useAdmin";
import {
  createCategoryAction,
  updateCategoryAction,
  archiveCategoryAction,
  restoreCategoryAction,
  generateCategoryImageUploadUrlAction,
  removeCategoryImageAction,
} from "@/features/admin/actions/category.actions";

import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import type { CategoryRow } from "@/lib/db/categories";

interface CategoryManagerProps {
  initialCategories: CategoryRow[];
}

// ---------------------------------------------------------------------------
// Image Upload Modal
// ---------------------------------------------------------------------------

interface ImageUploadModalProps {
  category: CategoryRow;
  onClose: () => void;
  onSuccess: (updatedCategory: CategoryRow) => void;
}

function CategoryImageUploadModal({ category, onClose, onSuccess }: ImageUploadModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0];
    if (!chosen) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowed.includes(chosen.type)) {
      setError("Please choose a JPEG, PNG, WebP, or AVIF image.");
      return;
    }
    if (chosen.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }
    setError(null);
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const urlRes = await generateCategoryImageUploadUrlAction({
        filename: file.name,
        contentType: file.type,
      });
      if (!urlRes.success || !urlRes.signedUrl) {
        throw new Error(urlRes.error ?? "Could not get upload URL");
      }
      const uploadRes = await fetch(urlRes.signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error(`Storage upload failed (${uploadRes.status})`);

      const saveRes = await updateCategoryAction({
        id: category.id,
        og_image: urlRes.publicUrl,
      });
      if (!saveRes.success || !saveRes.category) {
        throw new Error(saveRes.error ?? "Failed to save image URL");
      }
      onSuccess(saveRes.category as CategoryRow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!category.og_image) return;
    setRemoving(true);
    setError(null);
    const res = await removeCategoryImageAction(category.id, category.og_image);
    if (!res.success) {
      setError(res.error ?? "Failed to remove image");
      setRemoving(false);
      return;
    }
    onSuccess({ ...category, og_image: null });
  }

  return (
    <dialog
      open
      onClose={onClose}
      className={clsx(
        "fixed inset-0 z-50 m-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)]",
        "bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-lg)] w-full max-w-sm",
        "backdrop:bg-black/60"
      )}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-[var(--kit-text-primary)]">Category Image</h2>
          <p className="text-xs text-[var(--kit-text-muted)] mt-0.5 truncate max-w-[200px]">{category.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="relative mb-4 rounded-[var(--kit-radius-md)] overflow-hidden bg-[var(--kit-surface)] border border-[var(--kit-border)] aspect-video flex items-center justify-center">
        {preview ? (
          <Image src={preview} alt="Preview" fill className="object-cover" unoptimized />
        ) : category.og_image ? (
          <Image src={category.og_image} alt={category.name} fill className="object-cover" sizes="400px" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--kit-text-muted)]">
            <ImageIcon size={32} className="opacity-40" />
            <span className="text-xs">No image set</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFileChange}
        className="sr-only"
        id="cat-image-file-input"
      />

      {error && (
        <p className="mb-3 rounded-[var(--kit-radius-md)] bg-[var(--kit-danger)]/10 px-3 py-2 text-xs text-[var(--kit-danger)] border border-[var(--kit-danger)]/20">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {!file ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[var(--kit-radius-md)] border border-dashed border-[var(--kit-border)] text-xs font-medium text-[var(--kit-text-secondary)] hover:border-[var(--kit-accent)] hover:text-[var(--kit-accent)] transition-colors"
          >
            <Upload size={14} /> Choose image
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setFile(null); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="h-9 flex-1 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] text-xs font-medium text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="h-9 flex-1 inline-flex items-center justify-center gap-1.5 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {uploading ? <><Loader2 size={13} className="animate-spin" /> Uploading…</> : <><Upload size={13} /> Upload</>}
            </button>
          </div>
        )}
        {category.og_image && !file && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[var(--kit-radius-md)] border border-[var(--kit-danger)]/30 text-xs font-medium text-[var(--kit-danger)] hover:bg-[var(--kit-danger)]/10 disabled:opacity-50 transition-colors"
          >
            {removing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {removing ? "Removing…" : "Remove image"}
          </button>
        )}
      </div>
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Shared table component
// ---------------------------------------------------------------------------

interface CategoryTableProps {
  rows: CategoryRow[];
  allCategories: CategoryRow[];
  mode: "active" | "archived";
  loading: boolean;
  onEdit: (cat: CategoryRow) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onImageClick: (cat: CategoryRow) => void;
}

function CategoryTable({
  rows,
  allCategories,
  mode,
  loading,
  onEdit,
  onArchive,
  onRestore,
  onImageClick,
}: CategoryTableProps) {
  const emptyLabel =
    mode === "active" ? "No active categories. Create one above." : "No archived categories.";

  return (
    <div className="overflow-x-auto rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-[var(--kit-shadow-sm)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--kit-border)] bg-[var(--kit-surface)]">
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Image</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Category</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Slug</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-[var(--kit-text-muted)]">Parent</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-[var(--kit-text-muted)]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--kit-border)]">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-xs text-[var(--kit-text-muted)]">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((cat) => {
              const parent = allCategories.find((c) => c.id === cat.parent_id);
              return (
                <tr key={cat.id} className="hover:bg-[var(--kit-surface)] transition-colors">
                  {/* Thumbnail */}
                  <td className="px-4 py-3">
                    {mode === "active" ? (
                      <button
                        type="button"
                        onClick={() => onImageClick(cat)}
                        title="Manage category image"
                        className="group relative flex h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface)] hover:border-[var(--kit-accent)] transition-colors"
                      >
                        {cat.og_image ? (
                          <Image src={cat.og_image} alt={cat.name} fill className="object-cover" sizes="40px" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[var(--kit-text-muted)] group-hover:text-[var(--kit-accent)] transition-colors">
                            <FolderOpen size={16} />
                          </span>
                        )}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                          <Camera size={12} className="text-white" />
                        </span>
                      </button>
                    ) : (
                      /* Archived — non-interactive thumbnail */
                      <div className="relative flex h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface)] opacity-60">
                        {cat.og_image ? (
                          <Image src={cat.og_image} alt={cat.name} fill className="object-cover grayscale" sizes="40px" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[var(--kit-text-muted)]">
                            <FolderOpen size={16} />
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Name / Description */}
                  <td className="px-4 py-3">
                    <div>
                      <p className={`font-medium ${mode === "archived" ? "text-[var(--kit-text-muted)] line-through" : "text-[var(--kit-text-primary)]"}`}>
                        {cat.name}
                      </p>
                      {cat.description && (
                        <p className="text-xs text-[var(--kit-text-muted)] line-clamp-1">{cat.description}</p>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-3 font-mono text-xs text-[var(--kit-text-secondary)]">{cat.slug}</td>

                  <td className="px-3 py-3 text-xs text-[var(--kit-text-secondary)]">
                    {parent?.name ?? "—"}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {mode === "active" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onImageClick(cat)}
                            title="Manage image"
                            className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-accent)] transition-colors"
                          >
                            <Camera size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit(cat)}
                            title="Edit category"
                            className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onArchive(cat.id)}
                            disabled={loading}
                            title="Archive category"
                            className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-danger)] hover:bg-[var(--kit-danger)]/10 transition-colors disabled:opacity-40"
                          >
                            <Archive size={14} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRestore(cat.id)}
                          disabled={loading}
                          title="Restore category"
                          className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-success)] hover:bg-[var(--kit-success)]/10 transition-colors disabled:opacity-40"
                        >
                          <RotateCcw size={14} />
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
  );
}

// ---------------------------------------------------------------------------
// Main CategoryManager
// ---------------------------------------------------------------------------

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const { execute, loading, error } = useAdmin();

  // Separate active and archived immediately from initial data
  const [categories, setCategories] = React.useState<CategoryRow[]>(initialCategories);

  const activeCategories = categories.filter((c) => !c.archived_at);
  const archivedCategories = categories.filter((c) => Boolean(c.archived_at));

  const [tab, setTab] = React.useState<"active" | "archived">("active");

  // Create / Edit modal
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<CategoryRow | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [autoSlug, setAutoSlug] = React.useState(true);
  const [description, setDescription] = React.useState("");
  const [parentId, setParentId] = React.useState("");

  // Image modal
  const [imageModalCategory, setImageModalCategory] = React.useState<CategoryRow | null>(null);

  function openCreateModal() {
    setEditingCategory(null);
    setName(""); setSlug(""); setAutoSlug(true); setDescription(""); setParentId("");
    setModalOpen(true);
  }

  function openEditModal(cat: CategoryRow) {
    setEditingCategory(cat);
    setName(cat.name); setSlug(cat.slug); setAutoSlug(false);
    setDescription(cat.description ?? ""); setParentId(cat.parent_id ?? "");
    setModalOpen(true);
  }

  function handleNameChange(val: string) {
    setName(val);
    if (autoSlug) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-"));
    }
  }

  function upsert(updated: CategoryRow) {
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      return exists ? prev.map((c) => (c.id === updated.id ? updated : c)) : [...prev, updated];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingCategory) {
      const res = await execute(() =>
        updateCategoryAction({ id: editingCategory.id, name, slug, description: description || null, parent_id: parentId || null })
      );
      if (res?.success && res.category) { upsert(res.category as CategoryRow); setModalOpen(false); }
    } else {
      const res = await execute(() =>
        createCategoryAction({ name, slug, description: description || undefined, parent_id: parentId || null })
      );
      if (res?.success && res.category) { upsert(res.category as CategoryRow); setModalOpen(false); }
    }
  }

  async function handleArchive(id: string) {
    const res = await execute(() => archiveCategoryAction(id));
    if (res?.success && res.category) {
      upsert(res.category as CategoryRow);
      // Switch to archived tab so the user can see where it went
      setTab("archived");
    }
  }

  async function handleRestore(id: string) {
    const res = await execute(() => restoreCategoryAction(id));
    if (res?.success && res.category) {
      upsert(res.category as CategoryRow);
      // Switch back to active tab
      setTab("active");
    }
  }

  function handleImageSuccess(updated: CategoryRow) {
    upsert(updated);
    setImageModalCategory(updated);
  }

  return (
    <div className="space-y-4">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] p-1">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={clsx(
              "inline-flex h-7 items-center gap-1.5 rounded-[var(--kit-radius-sm)] px-3 text-xs font-medium transition-colors",
              tab === "active"
                ? "bg-[var(--kit-card)] text-[var(--kit-text-primary)] shadow-[var(--kit-shadow-sm)]"
                : "text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)]"
            )}
          >
            Active
            <span className={clsx("rounded-full px-1.5 py-px text-[10px] font-semibold",
              tab === "active" ? "bg-[var(--kit-accent)]/10 text-[var(--kit-accent)]" : "bg-[var(--kit-muted)] text-[var(--kit-text-muted)]"
            )}>
              {activeCategories.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("archived")}
            className={clsx(
              "inline-flex h-7 items-center gap-1.5 rounded-[var(--kit-radius-sm)] px-3 text-xs font-medium transition-colors",
              tab === "archived"
                ? "bg-[var(--kit-card)] text-[var(--kit-text-primary)] shadow-[var(--kit-shadow-sm)]"
                : "text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)]"
            )}
          >
            Archived
            {archivedCategories.length > 0 && (
              <span className={clsx("rounded-full px-1.5 py-px text-[10px] font-semibold",
                tab === "archived" ? "bg-[var(--kit-danger)]/10 text-[var(--kit-danger)]" : "bg-[var(--kit-muted)] text-[var(--kit-text-muted)]"
              )}>
                {archivedCategories.length}
              </span>
            )}
          </button>
        </div>

        {/* New Category button — only on active tab */}
        {tab === "active" && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-4 text-xs font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> New Category
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-[var(--kit-radius-md)] border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-3 text-xs text-[var(--kit-danger)]">
          {error}
        </div>
      )}

      {/* Table for current tab */}
      {tab === "active" ? (
        <CategoryTable
          rows={activeCategories}
          allCategories={categories}
          mode="active"
          loading={loading}
          onEdit={openEditModal}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onImageClick={setImageModalCategory}
        />
      ) : (
        <>
          <p className="text-xs text-[var(--kit-text-muted)]">
            Archived categories are hidden from the storefront. Restore them to make them active again.
          </p>
          <CategoryTable
            rows={archivedCategories}
            allCategories={categories}
            mode="archived"
            loading={loading}
            onEdit={openEditModal}
            onArchive={handleArchive}
            onRestore={handleRestore}
            onImageClick={setImageModalCategory}
          />
        </>
      )}

      {/* Create / Edit Modal */}
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
                onChange={(e) => { setSlug(e.target.value); setAutoSlug(false); }}
                required
                className={clsx(
                  "mt-1 h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
                  "bg-[var(--kit-surface)] px-3 text-sm font-mono text-[var(--kit-text-primary)]",
                  "focus:border-[var(--kit-accent)] focus:outline-none"
                )}
              />
            </div>
            <div>
              <label htmlFor="cat-parent-select" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                Parent Category
              </label>
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
                {activeCategories
                  .filter((c) => c.id !== editingCategory?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <label htmlFor="cat-desc-textarea" className="block text-xs font-medium text-[var(--kit-text-secondary)]">
                Description
              </label>
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

      {/* Image Upload Modal */}
      {imageModalCategory && (
        <CategoryImageUploadModal
          category={imageModalCategory}
          onClose={() => setImageModalCategory(null)}
          onSuccess={handleImageSuccess}
        />
      )}
    </div>
  );
}
