import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import type { User } from "@supabase/supabase-js";
import type { CustomerWithAddresses } from "@/lib/db/customers";
import * as customerService from "@/services/customer-service";

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
 * Delegates to the unified customer synchronization service:
 *   1. By auth_id  (direct link)
 *   2. By email    (guest-checkout record exists — links auth_id)
 *   3. Create      (brand-new user — provisions from auth metadata)
 *
 * Always returns a fully-linked CustomerWithAddresses.
 * Safe to call on every account page load — idempotent.
 */
export async function getOrCreateCustomer(
  user: User
): Promise<CustomerWithAddresses> {
  const customer = await customerService.syncCustomerProfile({
    id: user.id,
    email: user.email,
    phone: user.phone,
    user_metadata: user.user_metadata,
  });

  if (!customer) {
    throw new Error("Failed to resolve or provision customer record");
  }

  return customer;
}
