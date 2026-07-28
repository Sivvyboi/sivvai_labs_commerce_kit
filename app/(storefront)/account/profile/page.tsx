import { getCurrentUser } from "@/lib/auth/server-auth";
import * as customerRepo from "@/lib/db/customers";
import { ProfileForm } from "@/components/storefront/account/ProfileForm";
import { User } from "lucide-react";

export const metadata = {
  title: "Edit Profile",
  description: "Manage your account profile details.",
};

export const revalidate = 0;

export default async function AccountProfilePage() {
  const user = await getCurrentUser();
  let customer = user ? await customerRepo.findCustomerByAuthId(user.id) : null;
  if (!customer && user?.email) {
    customer = await customerRepo.findCustomerByEmail(user.email);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--kit-border)]">
        <div className="h-10 w-10 rounded-full bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] flex items-center justify-center">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--kit-text-primary)]">Edit Profile</h2>
          <p className="text-xs text-[var(--kit-muted-fg)]">Update your name and contact info.</p>
        </div>
      </div>

      {customer ? (
        <ProfileForm customer={customer} />
      ) : (
        <div className="p-6 rounded-xl border border-dashed border-[var(--kit-border)] bg-[var(--kit-surface)]/50 text-sm text-center text-[var(--kit-muted-fg)]">
          <p>
            No customer profile found. Sign in or enable authentication to manage your profile.
          </p>
        </div>
      )}
    </div>
  );
}
