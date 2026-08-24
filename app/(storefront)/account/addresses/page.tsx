import type { Metadata } from "next";
import { getCurrentUser, getOrCreateCustomer } from "@/lib/auth/server-auth";
import { AddressesClient } from "@/components/storefront/account/AddressesClient";
import { MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "My Addresses",
  description: "Manage your saved delivery addresses.",
};

export const revalidate = 0;

export default async function AccountAddressesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const customer = await getOrCreateCustomer(user);
  const addresses = customer.addresses ?? [];

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

      <AddressesClient initialAddresses={addresses} />
    </div>
  );
}
