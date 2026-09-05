import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, getOrCreateCustomer } from "@/lib/auth/server-auth";
import { AccountSidebar } from "@/components/storefront/account/AccountSidebar";
import { AccountProvider } from "@/components/providers/AccountProvider";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Auth guard — unauthenticated users go to sign-in
  const user = await getCurrentUser();
  if (!user) {
    redirect(`${ROUTES.auth.signIn}?next=/account`);
  }

  // 2. Resolve (or provision) the customer row for this auth user
  const customer = await getOrCreateCustomer(user);

  return (
    <AccountProvider customer={customer}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--kit-text-primary)]">
            Customer Account
          </h1>
          <p className="text-sm text-[var(--kit-muted-fg)] mt-1">
            Manage your profile, delivery addresses, and purchase history.
          </p>
        </div>

        {/* Main Layout Grid */}
        <div className="flex flex-col md:flex-row gap-8">
          <AccountSidebar />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </AccountProvider>
  );
}
