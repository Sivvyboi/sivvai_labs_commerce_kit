"use client";

import { useState } from "react";
import type { CustomerAddressRow } from "@/lib/db/customers";
import type { CustomerAddressInput } from "@/lib/validation/customer";
import { AddressCard } from "./AddressCard";
import { AddressForm } from "./AddressForm";
import { EmptyOrdersState } from "./EmptyOrdersState";
import { Plus } from "lucide-react";

interface AddressBookProps {
  addresses: CustomerAddressRow[];
  onSaveAddress: (input: CustomerAddressInput, addressId?: string) => Promise<unknown>;
  onDeleteAddress: (addressId: string) => Promise<unknown>;
  onSetDefaultAddress: (addressId: string) => Promise<unknown>;
  isLoading?: boolean;
}

export function AddressBook({
  addresses,
  onSaveAddress,
  onDeleteAddress,
  onSetDefaultAddress,
  isLoading,
}: AddressBookProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddressRow | null>(null);

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (address: CustomerAddressRow) => {
    setEditingAddress(address);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingAddress(null);
    setIsFormOpen(false);
  };

  const handleSubmitForm = async (input: CustomerAddressInput, addressId?: string) => {
    await onSaveAddress(input, addressId);
    handleCloseForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-[var(--kit-text-primary)]">
            Saved Addresses
          </h3>
          <p className="text-xs text-[var(--kit-muted-fg)]">
            Manage your delivery locations and default shipping destination.
          </p>
        </div>

        {!isFormOpen && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--kit-accent)] px-4 py-2.5 text-xs font-semibold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[44px] shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Address</span>
          </button>
        )}
      </div>

      {isFormOpen && (
        <AddressForm
          initialAddress={editingAddress}
          onSubmit={handleSubmitForm}
          onCancel={handleCloseForm}
          isLoading={isLoading}
        />
      )}

      {addresses.length === 0 && !isFormOpen ? (
        <EmptyOrdersState
          type="addresses"
          onActionClick={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={handleOpenEdit}
              onDelete={onDeleteAddress}
              onSetDefault={onSetDefaultAddress}
              isDeleting={isLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
