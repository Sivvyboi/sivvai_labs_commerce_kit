import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import type { User } from "@supabase/supabase-js";
import type { CustomerWithAddresses } from "@/lib/db/customers";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }
  return user;
}

/**
 * Resolves the customer record for an authenticated Supabase user.
 * Lookup order:
 *   1. By auth_id  (fastest — direct link)
 *   2. By email    (guest-checkout record exists — stamp auth_id on it)
 *   3. Create      (brand-new user — provision from auth metadata)
 *
 * Always returns a fully-linked CustomerWithAddresses.
 * Safe to call on every account page load — upsert is idempotent.
 */
export async function getOrCreateCustomer(
  user: User
): Promise<CustomerWithAddresses> {
  const supabase = await createClient();

  // 1. Prefer direct auth_id link
  const { data: byAuthId } = await supabase
    .from("customers")
    .select("*, addresses:customer_addresses(*)")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (byAuthId) return byAuthId as unknown as CustomerWithAddresses;

  // 2. Guest-checkout record: link it
  const { data: byEmail } = await supabase
    .from("customers")
    .select("*, addresses:customer_addresses(*)")
    .eq("email", user.email ?? "")
    .maybeSingle();

  if (byEmail) {
    const admin = createAdminClient();
    await admin
      .from("customers")
      .update({ auth_id: user.id })
      .eq("id", (byEmail as { id: string }).id);
    return byEmail as unknown as CustomerWithAddresses;
  }

  // 3. New user — provision from Supabase auth metadata
  const meta = user.user_metadata ?? {};
  const firstName: string =
    (meta.first_name as string) ||
    (meta.given_name as string) ||
    ((meta.name as string) || "").split(" ")[0] ||
    "";
  const lastName: string =
    (meta.last_name as string) ||
    (meta.family_name as string) ||
    ((meta.name as string) || "").split(" ").slice(1).join(" ") ||
    "";

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin
    .from("customers")
    .insert({
      auth_id: user.id,
      email: user.email ?? "",
      first_name: firstName,
      last_name: lastName,
      phone: null,
      status: "active",
    })
    .select("*, addresses:customer_addresses(*)")
    .single();

  if (createErr || !created) {
    throw createErr ?? new Error("Failed to provision customer record");
  }
  return created as unknown as CustomerWithAddresses;
}
