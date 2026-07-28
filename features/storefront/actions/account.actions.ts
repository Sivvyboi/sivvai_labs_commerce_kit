"use server";

/**
 * features/storefront/actions/account.actions.ts
 *
 * Server Actions for customer account, address book, order history, and guest order lookup.
 */

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server-auth";
import * as customerService from "@/services/customer-service";
import * as orderService from "@/services/order-service";
import { getOrCreateCartAction } from "./cart.actions";
import type {
  UpdateCustomerProfileInput,
  CustomerAddressInput,
  GuestOrderLookupInput,
} from "@/lib/validation/customer";

/**
 * Resolves the logged-in customer profile, or returns mock/guest fallback if auth is inactive.
 */
export async function getCustomerProfileAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    let customer = await customerService.getCustomerByAuthId(user.id);
    if (!customer && user.email) {
      // Check if existing customer record by email
      customer = await customerService.getCustomerProfile(user.id).catch(() => null);
    }

    if (!customer) {
      return { success: false, error: "Customer profile not found" };
    }

    return { success: true, customer };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load profile",
    };
  }
}

/**
 * Updates logged-in customer profile details (first_name, last_name, phone).
 */
export async function updateCustomerProfileAction(input: UpdateCustomerProfileInput) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const customer = await customerService.getCustomerByAuthId(user.id);
    if (!customer) {
      return { success: false, error: "Customer profile not found" };
    }

    const updated = await customerService.updateCustomerProfile(customer.id, input);
    revalidatePath("/account");
    revalidatePath("/account/profile");
    return { success: true, customer: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update profile",
    };
  }
}

/**
 * Lists orders for the logged-in customer.
 */
export async function listOrdersAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated", orders: [] };
    }

    const customer = await customerService.getCustomerByAuthId(user.id);
    if (!customer) {
      return { success: true, orders: [] };
    }

    const orders = await orderService.getCustomerOrders(customer.id);
    return { success: true, orders };
  } catch (err) {
    return {
      success: false,
      orders: [],
      error: err instanceof Error ? err.message : "Failed to fetch orders",
    };
  }
}

/**
 * Fetches order details for logged-in customer or guest order view.
 */
export async function getOrderAction(orderId: string) {
  try {
    const order = await orderService.getOrderDetails(orderId);
    return { success: true, order };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Order not found",
    };
  }
}

/**
 * Lists saved addresses for current customer.
 */
export async function listAddressesAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated", addresses: [] };
    }

    const customer = await customerService.getCustomerByAuthId(user.id);
    if (!customer) {
      return { success: true, addresses: [] };
    }

    const addresses = await customerService.getCustomerAddresses(customer.id);
    return { success: true, addresses };
  } catch (err) {
    return {
      success: false,
      addresses: [],
      error: err instanceof Error ? err.message : "Failed to list addresses",
    };
  }
}

/**
 * Adds or updates a customer address.
 */
export async function saveAddressAction(input: CustomerAddressInput, addressId?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const customer = await customerService.getCustomerByAuthId(user.id);
    if (!customer) {
      return { success: false, error: "Customer profile not found" };
    }

    const address = await customerService.saveCustomerAddress(customer.id, input, addressId);
    revalidatePath("/account/addresses");
    return { success: true, address };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save address",
    };
  }
}

/**
 * Deletes a customer address with auto-promotion of next default address.
 */
export async function deleteAddressAction(addressId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const customer = await customerService.getCustomerByAuthId(user.id);
    if (!customer) {
      return { success: false, error: "Customer profile not found" };
    }

    const result = await customerService.deleteCustomerAddress(customer.id, addressId);
    revalidatePath("/account/addresses");
    return { success: true, promotedDefaultId: result.promotedDefaultId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete address",
    };
  }
}

/**
 * Sets an address as default for current customer.
 */
export async function setDefaultAddressAction(addressId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const customer = await customerService.getCustomerByAuthId(user.id);
    if (!customer) {
      return { success: false, error: "Customer profile not found" };
    }

    const address = await customerService.setDefaultAddress(customer.id, addressId);
    revalidatePath("/account/addresses");
    return { success: true, address };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to set default address",
    };
  }
}

/**
 * Guest order lookup matching order number and email.
 */
export async function lookupGuestOrderAction(input: GuestOrderLookupInput) {
  try {
    const order = await orderService.lookupGuestOrder(input.orderNumber, input.email);
    return { success: true, order };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "No matching order found for provided credentials",
    };
  }
}

/**
 * Inventory-aware reorder action. Repopulates active cart with available items from previous order.
 */
export async function reorderAction(orderId: string) {
  try {
    const cartResult = await getOrCreateCartAction();
    if (!cartResult.cart) {
      return { success: false, error: "Active cart unavailable" };
    }

    const result = await orderService.reorderItemsFromOrder(orderId, cartResult.cart.id);
    revalidatePath("/cart");
    return { success: true, ...result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to process reorder",
    };
  }
}
