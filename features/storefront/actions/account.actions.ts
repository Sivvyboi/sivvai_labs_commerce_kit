"use server";

/**
 * features/storefront/actions/account.actions.ts
 *
 * Server Actions for customer account, address book, order history, and guest order lookup.
 */

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { createClient } from "@/lib/supabase/server";
import * as customerRepo from "@/lib/db/customers";
import * as customerService from "@/services/customer-service";
import * as orderService from "@/services/order-service";
import { getOrCreateCartAction, mergeCartOnLoginAction } from "./cart.actions";
import {
  CustomerSignInSchema,
  CustomerSignUpSchema,
  CustomerForgotPasswordSchema,
  CustomerResetPasswordSchema,
  type CustomerSignInInput,
  type CustomerSignUpInput,
  type CustomerForgotPasswordInput,
  type CustomerResetPasswordInput,
  type UpdateCustomerProfileInput,
  type CustomerAddressInput,
  type GuestOrderLookupInput,
} from "@/lib/validation/customer";

/**
 * Registers a new customer in Supabase Auth and links/creates their customer record.
 * Automatically merges any active guest cart into their new customer cart.
 */
export async function signUpAction(input: CustomerSignUpInput) {
  try {
    const validated = CustomerSignUpSchema.parse(input);
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          first_name: validated.firstName,
          last_name: validated.lastName,
        },
      },
    });

    if (authError || !authData.user) {
      return { success: false, error: authError?.message ?? "Registration failed" };
    }

    const authUser = authData.user;

    // Check if an existing customer record exists by email (e.g. from guest checkout)
    let customer = await customerRepo.findCustomerByEmail(validated.email);

    if (customer) {
      // Link existing record to new auth_id
      customer = (await customerRepo.updateCustomer(customer.id, {
        auth_id: authUser.id,
        first_name: validated.firstName,
        last_name: validated.lastName,
        phone: validated.phone || customer.phone,
      })) as unknown as typeof customer;
    } else {
      // Create fresh customer record
      const created = await customerRepo.createCustomer({
        auth_id: authUser.id,
        email: validated.email,
        first_name: validated.firstName,
        last_name: validated.lastName,
        phone: validated.phone || null,
        status: "active",
      });
      customer = created as unknown as typeof customer;
    }

    // If a session was returned (email auto-confirmed), merge guest cart immediately
    if (authData.session && customer?.id) {
      await mergeCartOnLoginAction(customer.id);
    }

    revalidatePath("/", "layout");
    return {
      success: true,
      requiresEmailConfirmation: !authData.session,
      userId: authUser.id,
      customer,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Registration failed",
    };
  }
}

/**
 * Signs in a customer and immediately merges any active guest cart into
 * their authenticated cart. Returns the merged cart alongside the auth result.
 */
export async function signInAction(emailOrInput: string | CustomerSignInInput, maybePassword?: string) {
  try {
    let email: string;
    let password: string;

    if (typeof emailOrInput === "object") {
      const validated = CustomerSignInSchema.parse(emailOrInput);
      email = validated.email;
      password = validated.password;
    } else {
      email = emailOrInput;
      password = maybePassword || "";
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { success: false, error: error?.message ?? "Sign-in failed" };
    }

    // Resolve the customer profile for cart merge
    const customer = await customerService.getCustomerByAuthId(data.user.id);
    const customerId = customer?.id;

    if (customerId) {
      await mergeCartOnLoginAction(customerId);
    }

    revalidatePath("/", "layout");
    return { success: true, userId: data.user.id, customer };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Sign-in failed",
    };
  }
}

/**
 * Initializes OAuth authentication (Google) using Supabase Auth.
 * Returns the authorization URL for browser redirect.
 */
export async function signInWithOAuthAction(input: {
  provider: "google";
  redirectTo?: string;
}) {
  try {
    const supabase = await createClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const nextPath = input.redirectTo || "/account";
    const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: input.provider,
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (error || !data?.url) {
      return {
        success: false,
        error: error?.message || `Failed to initialize ${input.provider} sign-in`,
      };
    }

    return {
      success: true,
      url: data.url,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to initialize social sign-in",
    };
  }
}

/**
 * Sends a password reset email to a customer.
 */
export async function requestCustomerPasswordResetAction(input: CustomerForgotPasswordInput) {
  try {
    const validated = CustomerForgotPasswordSchema.parse(input);
    const supabase = await createClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
      redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send reset email",
    };
  }
}

/**
 * Updates customer password during password reset flow.
 */
export async function resetCustomerPasswordAction(input: CustomerResetPasswordInput) {
  try {
    const validated = CustomerResetPasswordSchema.parse(input);
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      password: validated.password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Password reset failed",
    };
  }
}

/**
 * Signs out the current customer.
 */
export async function signOutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Sign-out failed",
    };
  }
}

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
