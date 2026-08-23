import * as customerRepo from "@/lib/db/customers";
import type { CustomerAddressRow, CustomerRow, CustomerWithAddresses } from "@/lib/db/customers";
import { UpdateCustomerProfileSchema, CustomerAddressSchema } from "@/lib/validation/customer";
import type { UpdateCustomerProfileInput, CustomerAddressInput } from "@/lib/validation/customer";
import { parseOAuthNames, type OAuthUserData } from "@/lib/auth/oauth";
import { NotFoundError } from "@/lib/errors";

export { parseOAuthNames, type OAuthUserData };

/**
 * services/customer-service.ts
 *
 * Domain business logic for customer profile management and address lifecycle rules.
 *
 * Business Rules:
 *  - Enforces profile input validation.
 *  - Default Address Protection:
 *      * If a customer has no addresses, the first added address is automatically marked default.
 *      * Setting a new default address unsets previous defaults.
 *      * Deleting the current default address automatically promotes the next available address to default.
 */

export async function getCustomerProfile(customerId: string): Promise<CustomerWithAddresses> {
  const customer = await customerRepo.findCustomerById(customerId);
  if (!customer) {
    throw new NotFoundError("Customer", customerId);
  }
  return customer;
}

export async function getCustomerByAuthId(authId: string): Promise<CustomerWithAddresses | null> {
  return customerRepo.findCustomerByAuthId(authId);
}

/**
 * Synchronizes customer profile on OAuth login:
 *  1. Checks if customer exists by auth_id (returns or backfills names).
 *  2. Checks if customer exists by email (links auth_id without creating duplicate).
 *  3. Creates new customer record if neither exists.
 */
export async function syncCustomerOnOAuthLogin(
  authUser: OAuthUserData
): Promise<CustomerWithAddresses | null> {
  const email = authUser.email?.toLowerCase().trim();
  if (!email) return null;

  const { firstName, lastName } = parseOAuthNames(authUser.user_metadata);

  // 1. Check if customer already exists by auth_id
  let customer = await customerRepo.findCustomerByAuthId(authUser.id);

  if (customer) {
    const updates: customerRepo.CustomerUpdate = {};
    if (!customer.first_name && firstName) updates.first_name = firstName;
    if (!customer.last_name && lastName) updates.last_name = lastName;
    if (!customer.phone && authUser.phone) updates.phone = authUser.phone;

    if (Object.keys(updates).length > 0) {
      await customerRepo.updateCustomer(customer.id, updates);
      customer = await customerRepo.findCustomerById(customer.id);
    }
    return customer;
  }

  // 2. Check if customer exists by email (e.g. from prior guest checkout or email signup)
  customer = await customerRepo.findCustomerByEmail(email);

  if (customer) {
    const updates: customerRepo.CustomerUpdate = {
      auth_id: authUser.id,
    };
    if (!customer.first_name && firstName) updates.first_name = firstName;
    if (!customer.last_name && lastName) updates.last_name = lastName;
    if (!customer.phone && authUser.phone) updates.phone = authUser.phone;

    await customerRepo.updateCustomer(customer.id, updates);
    return customerRepo.findCustomerById(customer.id);
  }

  // 3. Create fresh customer record
  const created = await customerRepo.createCustomer({
    auth_id: authUser.id,
    email,
    first_name: firstName,
    last_name: lastName,
    phone: authUser.phone || null,
    status: "active",
  });

  return customerRepo.findCustomerById(created.id);
}

export async function updateCustomerProfile(
  customerId: string,
  input: UpdateCustomerProfileInput
): Promise<CustomerRow> {
  const validated = UpdateCustomerProfileSchema.parse(input);
  
  const existing = await customerRepo.findCustomerById(customerId);
  if (!existing) {
    throw new NotFoundError("Customer", customerId);
  }

  return customerRepo.updateCustomer(customerId, {
    first_name: validated.firstName,
    last_name: validated.lastName,
    phone: validated.phone || null,
  });
}

export async function getCustomerAddresses(customerId: string): Promise<CustomerAddressRow[]> {
  return customerRepo.findCustomerAddresses(customerId);
}

export async function saveCustomerAddress(
  customerId: string,
  input: CustomerAddressInput,
  addressId?: string
): Promise<CustomerAddressRow> {
  const validated = CustomerAddressSchema.parse(input);
  const existingAddresses = await customerRepo.findCustomerAddresses(customerId);

  // If this is the first address, automatically make it default
  const isFirstAddress = existingAddresses.length === 0;
  const isDefault = validated.isDefault || isFirstAddress;

  if (addressId) {
    // Updating existing address
    const target = existingAddresses.find((a) => a.id === addressId);
    if (!target) {
      throw new NotFoundError("CustomerAddress", addressId);
    }

    if (isDefault && !target.is_default) {
      // Unset previous defaults
      for (const addr of existingAddresses) {
        if (addr.id !== addressId && addr.is_default) {
          await customerRepo.updateCustomerAddress(addr.id, customerId, { is_default: false });
        }
      }
    }

    return customerRepo.updateCustomerAddress(addressId, customerId, {
      label: validated.label,
      street_line_1: validated.streetLine1,
      street_line_2: validated.streetLine2 || null,
      city: validated.city,
      state: validated.state,
      country: validated.country,
      is_default: isDefault,
    });
  } else {
    // Adding new address
    if (isDefault) {
      // Unset previous defaults
      for (const addr of existingAddresses) {
        if (addr.is_default) {
          await customerRepo.updateCustomerAddress(addr.id, customerId, { is_default: false });
        }
      }
    }

    return customerRepo.addCustomerAddress({
      customer_id: customerId,
      label: validated.label,
      street_line_1: validated.streetLine1,
      street_line_2: validated.streetLine2 || null,
      city: validated.city,
      state: validated.state,
      country: validated.country,
      is_default: isDefault,
    });
  }
}

export async function deleteCustomerAddress(
  customerId: string,
  addressId: string
): Promise<{ success: boolean; promotedDefaultId?: string }> {
  const existingAddresses = await customerRepo.findCustomerAddresses(customerId);
  const target = existingAddresses.find((a) => a.id === addressId);

  if (!target) {
    throw new NotFoundError("CustomerAddress", addressId);
  }

  // Delete target address
  await customerRepo.deleteCustomerAddress(addressId, customerId);

  const remainingAddresses = existingAddresses.filter((a) => a.id !== addressId);

  // If deleted address was default and remaining addresses exist, promote the first remaining one
  let promotedDefaultId: string | undefined;
  if (target.is_default && remainingAddresses.length > 0) {
    const nextDefault = remainingAddresses[0];
    await customerRepo.setDefaultCustomerAddress(nextDefault.id, customerId);
    promotedDefaultId = nextDefault.id;
  }

  return { success: true, promotedDefaultId };
}

export async function setDefaultAddress(
  customerId: string,
  addressId: string
): Promise<CustomerAddressRow> {
  const existingAddresses = await customerRepo.findCustomerAddresses(customerId);
  const target = existingAddresses.find((a) => a.id === addressId);

  if (!target) {
    throw new NotFoundError("CustomerAddress", addressId);
  }

  return customerRepo.setDefaultCustomerAddress(addressId, customerId);
}

// ---------------------------------------------------------------------------
// Admin service functions
// ---------------------------------------------------------------------------

export async function getAllCustomers(params: customerRepo.FindAllCustomersParams = {}) {
  return customerRepo.findAllCustomers(params);
}

