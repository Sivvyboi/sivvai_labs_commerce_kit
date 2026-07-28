import { featureFlag } from "@/config/feature-flags";
import { AccountSidebar } from "@/components/storefront/account/AccountSidebar";
import Link from "next/link";
import { Info, Search } from "lucide-react";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--kit-text-primary)]">
          Customer Account
        </h1>
        <p className="text-sm text-[var(--kit-muted-fg)] mt-1">
          Manage your account profile, delivery addresses, and track purchase history.
        </p>
      </div>

      {/* Feature Flag Banner if Auth disabled */}
      {!featureFlag.auth && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50 text-xs">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Customer authentication is currently disabled.</p>
              <p className="text-amber-700 dark:text-amber-300">
                You are viewing the account area in guest preview mode. You can look up your orders using Guest Order Lookup.
              </p>
            </div>
          </div>
          <Link
            href="/orders/lookup"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors shrink-0 shadow-sm min-h-[36px]"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Guest Lookup</span>
          </Link>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="flex flex-col md:flex-row gap-8">
        <AccountSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
