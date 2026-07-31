import "server-only";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "@/types";

export type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
export type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];


export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export async function findCategories(): Promise<CategoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .is("archived_at", null)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as CategoryRow[];
}

export async function findCategoryById(id: string): Promise<CategoryRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as unknown as CategoryRow;
}

export async function findCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as unknown as CategoryRow;
}

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

/** Returns ALL categories including archived — for admin management */
export async function findAllCategories(): Promise<CategoryRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CategoryRow[];
}

export async function createCategory(data: CategoryInsert): Promise<CategoryRow> {
  const supabase = createAdminClient();
  const { data: created, error } = await supabase
    .from("categories")
    .insert(data)
    .select()
    .single();

  if (error || !created) throw error || new Error("Failed to create category");
  return created;
}

export async function updateCategory(id: string, data: CategoryUpdate): Promise<CategoryRow> {
  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from("categories")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) throw error || new Error("Failed to update category");
  return updated;
}

export async function archiveCategory(id: string): Promise<CategoryRow> {
  return updateCategory(id, { archived_at: new Date().toISOString() });
}

export async function restoreCategory(id: string): Promise<CategoryRow> {
  return updateCategory(id, { archived_at: null });
}
