import { GuestOrderLookupForm } from "@/components/storefront/account/GuestOrderLookupForm";
import { Search } from "lucide-react";

export const metadata = {
  title: "Track Your Order",
  description: "Look up your order status using your order number and email address.",
};

export default function OrderLookupPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--kit-border)]">
        <div className="h-10 w-10 rounded-full bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] flex items-center justify-center">
          <Search className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--kit-text-primary)]">
            Guest Order Lookup
          </h1>
          <p className="text-xs text-[var(--kit-muted-fg)]">
            Track any order using your order number and the email address used at checkout.
          </p>
        </div>
      </div>

      <GuestOrderLookupForm />
    </div>
  );
}
