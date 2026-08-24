import type { Metadata } from "next";
import { getCurrentUser, getOrCreateCustomer } from "@/lib/auth/server-auth";
import { ProfileForm } from "@/components/storefront/account/ProfileForm";
import { User } from "lucide-react";

export const metadata: Metadata = {
  title: "Edit Profile",
  description: "Manage your account name, phone number, and contact info.",
};

export const revalidate = 0;

export default async function AccountProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const customer = await getOrCreateCustomer(user);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--kit-border)]">
        <div className="h-10 w-10 rounded-full bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] flex items-center justify-center">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--kit-text-primary)]">Edit Profile</h2>
          <p className="text-xs text-[var(--kit-muted-fg)]">
            Update your name, phone number, and contact details.
          </p>
        </div>
      </div>

      <ProfileForm customer={customer} />
    </div>
  );
}
