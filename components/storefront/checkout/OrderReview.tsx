"use client";

/**
 * components/storefront/checkout/OrderReview.tsx
 *
 * Client Component. Step 3 Order Review Panel.
 * Summarizes customer contact details, delivery address, selected shipping method,
 * and cart line items (with product images, SKU/variant attributes, and correct major-unit pricing)
 * before advancing to payment initiation.
 */

import Image from "next/image";
import type { ContactInfo, ShippingAddressInfo, CheckoutStep } from "@/features/storefront/hooks/useCheckout";
import type { ResolvedShippingOption } from "@/services/shipping-service";
import { useCart } from "@/features/storefront/hooks/useCart";
import { Price } from "@/components/shared/Price";
import { User, MapPin, Truck, Edit2, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface OrderReviewProps {
  contact: ContactInfo;
  address: ShippingAddressInfo;
  shippingMethodId: string | null;
  selectedShippingOption?: ResolvedShippingOption | null;
  onEditStep: (step: CheckoutStep) => void;
  className?: string;
}

export function OrderReview({
  contact,
  address,
  shippingMethodId,
  selectedShippingOption,
  onEditStep,
  className,
}: OrderReviewProps) {
  const { cart } = useCart();
  const items = cart?.items ?? [];

  return (
    <div className={cn("space-y-6", className)}>
      <h2 className="text-base font-bold text-[var(--kit-text-primary)]">
        Review Your Order
      </h2>

      {/* Contact & Address Summary Box */}
      <div className="rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-4 space-y-4 shadow-xs">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--kit-border)] pb-3">
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-[var(--kit-accent)] mt-0.5 shrink-0" />
            <div className="space-y-0.5 text-xs sm:text-sm">
              <p className="font-bold text-[var(--kit-text-primary)]">
                {contact.fullName || "Guest Customer"}
              </p>
              <p className="text-[var(--kit-muted-fg)]">{contact.email}</p>
              {contact.phone && (
                <p className="text-[var(--kit-muted-fg)]">{contact.phone}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onEditStep(1)}
            aria-label="Edit contact details"
            className="flex items-center gap-1 text-xs font-semibold text-[var(--kit-accent)] hover:underline min-h-[36px]"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>
        </div>

        {/* Shipping Address Summary */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-[var(--kit-accent)] mt-0.5 shrink-0" />
            <div className="space-y-0.5 text-xs sm:text-sm text-[var(--kit-text-primary)]">
              <p className="font-semibold">{address.addressLine1}</p>
              {address.addressLine2 && <p>{address.addressLine2}</p>}
              <p>
                {address.city}, {address.state} ({address.country})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onEditStep(1)}
            aria-label="Edit address"
            className="flex items-center gap-1 text-xs font-semibold text-[var(--kit-accent)] hover:underline min-h-[36px]"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Selected Shipping Method Summary Box */}
      <div className="rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-4 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <Truck className="h-4 w-4 text-[var(--kit-accent)] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-0.5">
            <p className="font-bold text-[var(--kit-text-primary)]">
              {selectedShippingOption?.name ?? (shippingMethodId ? "Delivery Method Selected" : "Delivery Not Selected")}
            </p>
            <p className="text-xs text-[var(--kit-muted-fg)]">
              {selectedShippingOption
                ? selectedShippingOption.estimatedDaysMin && selectedShippingOption.estimatedDaysMax
                  ? `Estimated delivery: ${selectedShippingOption.estimatedDaysMin}–${selectedShippingOption.estimatedDaysMax} business days`
                  : "Standard Delivery"
                : "No delivery method selected"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedShippingOption && (
            <div className="text-xs sm:text-sm font-bold text-[var(--kit-text-primary)]">
              {selectedShippingOption.isFree || selectedShippingOption.amount === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">FREE</span>
              ) : (
                <Price amount={selectedShippingOption.amount} size="sm" />
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => onEditStep(2)}
            aria-label="Edit shipping method"
            className="flex items-center gap-1 text-xs font-semibold text-[var(--kit-accent)] hover:underline min-h-[36px]"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Cart Items List Review */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--kit-muted-fg)]">
          Cart Items ({items.length})
        </h3>

        <div className="divide-y divide-[var(--kit-border)] rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] px-4 overflow-hidden">
          {items.map((item) => {
            const product = item.variant?.product;
            const productName = product?.name ?? "Product Item";
            const variantSku = item.variant?.sku;

            // Resolve product primary image or first available image
            const imageUrl =
              product?.images?.find((img) => img.is_primary)?.url ??
              product?.images?.[0]?.url ??
              null;

            // unit_price_snapshot is stored in minor units (kobo/cents), convert to major units for Price component
            const unitPriceMajor = (Number(item.unit_price_snapshot ?? 0)) / 100;
            const lineTotalMajor = unitPriceMajor * item.quantity;

            return (
              <div key={item.id} className="py-3 flex items-center gap-3">
                {/* Thumbnail Image */}
                <div className="relative h-12 w-12 rounded-xl bg-[var(--kit-surface)] border border-[var(--kit-border)] overflow-hidden shrink-0">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={productName}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--kit-muted-fg)]">
                      <ShoppingBag className="h-5 w-5 opacity-30" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-[var(--kit-text-primary)] truncate">
                    {productName}
                  </p>
                  {variantSku && (
                    <p className="text-[10px] text-[var(--kit-muted-fg)] truncate">
                      SKU: {variantSku}
                    </p>
                  )}
                  <p className="text-[11px] text-[var(--kit-muted-fg)]">
                    Qty: {item.quantity} × <Price amount={unitPriceMajor} size="sm" />
                  </p>
                </div>

                {/* Line Total */}
                <div className="text-right text-xs sm:text-sm font-bold text-[var(--kit-text-primary)]">
                  <Price amount={lineTotalMajor} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
