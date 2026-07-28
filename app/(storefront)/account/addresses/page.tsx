"use client";

import { useEffect } from "react";
import { AddressBook } from "@/components/storefront/account/AddressBook";
import { useAccount } from "@/features/storefront/hooks/useAccount";
import { MapPin, Loader2 } from "lucide-react";

export default function AccountAddressesPage() {
  const { addresses, isLoading, fetchAddresses, saveAddress, deleteAddress, setDefaultAddress } =
    useAccount();

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--kit-border)]">
        <div className="h-10 w-10 rounded-full bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] flex items-center justify-center">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--kit-text-primary)]">Saved Addresses</h2>
          <p className="text-xs text-[var(--kit-muted-fg)]">
            Manage your shipping destinations and default address.
          </p>
        </div>
      </div>

      {isLoading && addresses.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--kit-accent)]" />
        </div>
      ) : (
        <AddressBook
          addresses={addresses}
          onSaveAddress={saveAddress}
          onDeleteAddress={deleteAddress}
          onSetDefaultAddress={setDefaultAddress}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
