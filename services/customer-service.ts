import * as customerRepo from "@/lib/db/customers";
import type { CustomerAddressRow, CustomerRow, CustomerWithAddresses } from "@/lib/db/customers";
import { UpdateCustomerProfileSchema, CustomerAddressSchema } from "@/lib/validation/customer";
import type { UpdateCustomerProfileInput, CustomerAddressInput } from "@/lib/validation/customer";
import { NotFoundError } from "@/lib/errors";

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

