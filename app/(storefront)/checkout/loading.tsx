/**
 * app/(storefront)/checkout/loading.tsx
 *
 * Layout-matched skeleton loading state for the Checkout route.
 */

export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 animate-pulse">
      <div className="h-4 w-48 bg-[var(--kit-surface)] rounded-sm" />

      <div className="border-b border-[var(--kit-border)] pb-4 space-y-2">
        <div className="h-8 w-40 bg-[var(--kit-surface)] rounded-md" />
        <div className="h-4 w-64 bg-[var(--kit-surface)] rounded-md" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Form Area Skeleton (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="h-14 bg-[var(--kit-surface)] rounded-full" />
          <div className="h-48 bg-[var(--kit-surface)] rounded-2xl" />
          <div className="h-64 bg-[var(--kit-surface)] rounded-2xl" />
        </div>

        {/* Right Summary Skeleton (5 cols) */}
        <div className="lg:col-span-5">
          <div className="h-80 bg-[var(--kit-surface)] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
