"use client";

/**
 * components/storefront/account/AddressesClient.tsx
 *
 * Thin client wrapper for the Addresses page.
 * Receives server-fetched initialAddresses as a prop (instant — no loading flash),
 * then manages mutations (add/edit/delete/set-default) via useAccount() and router.refresh().
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import type { CustomerAddressRow } from "@/lib/db/customers";
import type { CustomerAddressInput } from "@/lib/validation/customer";
import { useAccount } from "@/features/storefront/hooks/useAccount";
import { AddressBook } from "./AddressBook";
import { Loader2 } from "lucide-react";

export function AddressesClient({
  initialAddresses,
}: {
  initialAddresses: CustomerAddressRow[];
}) {
  const router = useRouter();
  const [addresses, setAddresses] = React.useState<CustomerAddressRow[]>(initialAddresses);
  const [isLoading, setIsLoading] = React.useState(false);
  const { saveAddress, deleteAddress, setDefaultAddress } = useAccount();

  // Keep state in sync if initialAddresses changes (e.g. on router.refresh)
  React.useEffect(() => {
    setAddresses(initialAddresses);
  }, [initialAddresses]);

  const handleSave = async (input: CustomerAddressInput, addressId?: string) => {
    setIsLoading(true);
    const res = await saveAddress(input, addressId);
    if (res && typeof res === "object" && "success" in res && res.success) {
      router.refresh();
    }
    setIsLoading(false);
    return res;
  };

  const handleDelete = async (addressId: string) => {
    setIsLoading(true);
    const res = await deleteAddress(addressId);
    if (res && typeof res === "object" && "success" in res && res.success) {
      setAddresses((prev) => prev.filter((a) => a.id !== addressId));
      router.refresh();
    }
    setIsLoading(false);
    return res;
  };

  const handleSetDefault = async (addressId: string) => {
    setIsLoading(true);
    const res = await setDefaultAddress(addressId);
    if (res && typeof res === "object" && "success" in res && res.success) {
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === addressId }))
      );
      router.refresh();
    }
    setIsLoading(false);
    return res;
  };

  if (isLoading && addresses.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--kit-accent)]" />
      </div>
    );
  }

  return (
    <AddressBook
      addresses={addresses}
      onSaveAddress={handleSave}
      onDeleteAddress={handleDelete}
      onSetDefaultAddress={handleSetDefault}
      isLoading={isLoading}
    />
  );
}
