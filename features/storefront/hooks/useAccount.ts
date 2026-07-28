"use client";

import { useState, useCallback } from "react";
import type { CustomerWithAddresses, CustomerAddressRow } from "@/lib/db/customers";
import type { OrderWithLines } from "@/lib/db/orders";
import type {
  UpdateCustomerProfileInput,
  CustomerAddressInput,
  GuestOrderLookupInput,
} from "@/lib/validation/customer";
import {
  getCustomerProfileAction,
  updateCustomerProfileAction,
  listOrdersAction,
  listAddressesAction,
  saveAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  lookupGuestOrderAction,
  reorderAction,
} from "../actions/account.actions";

export function useAccount() {
  const [customer, setCustomer] = useState<CustomerWithAddresses | null>(null);
  const [orders, setOrders] = useState<OrderWithLines[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddressRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await getCustomerProfileAction();
    if (res.success && res.customer) {
      setCustomer(res.customer as CustomerWithAddresses);
    } else {
      setError(res.error || "Failed to load profile");
    }
    setIsLoading(false);
  }, []);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await listOrdersAction();
    if (res.success) {
      setOrders(res.orders as OrderWithLines[]);
    } else {
      setError(res.error || "Failed to fetch orders");
    }
    setIsLoading(false);
  }, []);

  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await listAddressesAction();
    if (res.success) {
      setAddresses(res.addresses);
    } else {
      setError(res.error || "Failed to fetch addresses");
    }
    setIsLoading(false);
  }, []);

  const updateProfile = async (input: UpdateCustomerProfileInput) => {
    setIsLoading(true);
    setError(null);
    const res = await updateCustomerProfileAction(input);
    if (res.success && res.customer) {
      setCustomer((prev) => (prev ? { ...prev, ...res.customer } : null));
    } else {
      setError(res.error || "Failed to update profile");
    }
    setIsLoading(false);
    return res;
  };

  const saveAddress = async (input: CustomerAddressInput, addressId?: string) => {
    setIsLoading(true);
    setError(null);
    const res = await saveAddressAction(input, addressId);
    if (res.success) {
      await fetchAddresses();
    } else {
      setError(res.error || "Failed to save address");
    }
    setIsLoading(false);
    return res;
  };

  const deleteAddress = async (addressId: string) => {
    setIsLoading(true);
    setError(null);
    const res = await deleteAddressAction(addressId);
    if (res.success) {
      await fetchAddresses();
    } else {
      setError(res.error || "Failed to delete address");
    }
    setIsLoading(false);
    return res;
  };

  const setDefaultAddress = async (addressId: string) => {
    setIsLoading(true);
    setError(null);
    const res = await setDefaultAddressAction(addressId);
    if (res.success) {
      await fetchAddresses();
    } else {
      setError(res.error || "Failed to set default address");
    }
    setIsLoading(false);
    return res;
  };

  const lookupOrder = async (input: GuestOrderLookupInput) => {
    setIsLoading(true);
    setError(null);
    const res = await lookupGuestOrderAction(input);
    setIsLoading(false);
    return res;
  };

  const reorder = async (orderId: string) => {
    setIsLoading(true);
    setError(null);
    const res = await reorderAction(orderId);
    setIsLoading(false);
    return res;
  };

  return {
    customer,
    orders,
    addresses,
    isLoading,
    error,
    fetchProfile,
    fetchOrders,
    fetchAddresses,
    updateProfile,
    saveAddress,
    deleteAddress,
    setDefaultAddress,
    lookupOrder,
    reorder,
  };
}
