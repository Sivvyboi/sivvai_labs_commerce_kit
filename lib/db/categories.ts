import "server-only";
import { createClient } from "../supabase/server";
import type { Database } from "@/types";

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
