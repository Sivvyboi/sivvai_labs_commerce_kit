"use server";

import { requirePermission } from "@/lib/auth/admin-guard";
import * as customerService from "@/services/customer-service";

export async function listCustomersAction(params?: { search?: string; limit?: number; offset?: number }) {
  try {
    await requirePermission("view_customers");
    const result = await customerService.getAllCustomers(params);
    return { success: true, ...result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to list customers",
    };
  }
}

export async function getCustomerAction(id: string) {
  try {
    await requirePermission("view_customers");
    const customer = await customerService.getCustomerProfile(id);
    return { success: true, customer };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Customer not found",
    };
  }
}
