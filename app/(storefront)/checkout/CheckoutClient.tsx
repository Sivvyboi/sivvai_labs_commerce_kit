"use client";

/**
 * app/(storefront)/checkout/CheckoutClient.tsx
 *
 * Primary Client Component for the 4-Step Checkout View.
 * Integrates:
 *  - CheckoutStepper (Step indicator)
 *  - Step 1: ContactForm & ShippingAddressForm
 *  - Step 2: ShippingMethodSelector
 *  - Step 3: OrderReview
 *  - Step 4: PaymentMethodSelector & CouponInput
 *  - OrderSummary (Right column on desktop, collapsible top on mobile)
 *  - PlaceOrderButton
 */

import { useState } from "react";
import { useCheckout, type CheckoutStep } from "@/features/storefront/hooks/useCheckout";
import { CheckoutStepper } from "@/components/storefront/checkout/CheckoutStepper";
import { ContactForm } from "@/components/storefront/checkout/ContactForm";
import { ShippingAddressForm } from "@/components/storefront/checkout/ShippingAddressForm";
import { ShippingMethodSelector } from "@/components/storefront/checkout/ShippingMethodSelector";
import { OrderReview } from "@/components/storefront/checkout/OrderReview";
import { PaymentMethodSelector } from "@/components/storefront/checkout/PaymentMethodSelector";
import { CouponInput } from "@/components/storefront/checkout/CouponInput";
import { OrderSummary } from "@/components/storefront/checkout/OrderSummary";
import { PlaceOrderButton } from "@/components/storefront/checkout/PlaceOrderButton";
import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";

import type { CustomerWithAddresses } from "@/lib/db/customers";
import { SavedAddressSelector } from "@/components/storefront/checkout/SavedAddressSelector";

export interface CheckoutClientProps {
  customer?: CustomerWithAddresses | null;
}

export function CheckoutClient({ customer }: CheckoutClientProps) {
  const {
    step,
    contact,
    address,
    addressMode,
    selectedAddressId,
    savedAddresses,
    saveAddressToAccount,
    shippingMethodId,
    shippingTotal,
    promoCode,
    discountTotal,
    paymentProvider,
    subtotal,
    grandTotal,
    isSubmitting,
    errorMessage,
    goToStep,
    nextStep,
    previousStep,
    updateContact,
    updateAddress,
    selectSavedAddress,
    selectNewAddress,
    setSaveAddressToAccount,
    selectShippingMethod,
    applyCoupon,
    removeCoupon,
    setPaymentProvider,
    submitCheckout,
  } = useCheckout({ customer });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Validate Step 1 (Contact & Address) before proceeding
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};

    if (!contact.fullName.trim()) errs.fullName = "Full name is required";
    if (!contact.email.trim() || !contact.email.includes("@")) {
      errs.email = "Valid email address is required";
    }

    if (addressMode === "saved" && !selectedAddressId) {
      errs.address = "Please select a delivery address";
    }

    if (!address.addressLine1.trim()) errs.addressLine1 = "Street address is required";
    if (!address.city.trim()) errs.city = "City is required";
    if (!address.state.trim()) errs.state = "State/Region is required";

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextFromStep1 = () => {
    if (validateStep1()) {
      nextStep();
    }
  };

  const handleNextFromStep2 = () => {
    if (!shippingMethodId) {
      setFormErrors({ shipping: "Please select a shipping method" });
      return;
    }
    setFormErrors({});
    nextStep();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
      {/* Main Checkout Stepper & Form Columns (7 cols on desktop) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Stepper Header */}
        <CheckoutStepper
          currentStep={step}
          onStepClick={(s) => goToStep(s)}
        />

        {/* Global / Submit Error Alert */}
        {errorMessage && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-xs sm:text-sm font-medium">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Contact & Address */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <ContactForm
              contact={contact}
              onChange={updateContact}
              errors={formErrors}
              isLoggedIn={Boolean(customer)}
            />

            {/* Saved Address Selector for Logged-In Customers with Addresses */}
            {customer && savedAddresses.length > 0 && (
              <SavedAddressSelector
                addresses={savedAddresses}
                selectedAddressId={selectedAddressId}
                mode={addressMode}
                onSelectAddress={selectSavedAddress}
                onSelectNewAddress={selectNewAddress}
              />
            )}

            {formErrors.address && (
              <p className="text-xs text-red-500 font-medium">{formErrors.address}</p>
            )}

            {/* New Shipping Address Form (Guests, customers without saved addresses, or "Use new address" mode) */}
            {(!customer || savedAddresses.length === 0 || addressMode === "new") && (
              <ShippingAddressForm
                address={address}
                onChange={updateAddress}
                errors={formErrors}
                showSaveOption={Boolean(customer)}
                saveToAccount={saveAddressToAccount}
                onSaveToAccountChange={setSaveAddressToAccount}
                hideHeading={Boolean(customer && savedAddresses.length > 0)}
              />
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleNextFromStep1}
                className="flex items-center gap-2 rounded-xl bg-[var(--kit-accent)] px-6 py-3.5 text-sm font-bold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity shadow-xs min-h-[48px]"
              >
                <span>Continue to Shipping</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Shipping Method */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <ShippingMethodSelector
              selectedMethodId={shippingMethodId}
              onSelectMethod={(id) => selectShippingMethod(id)}
              subtotal={subtotal}
            />

            {formErrors.shipping && (
              <p className="text-xs text-red-500 font-medium">{formErrors.shipping}</p>
            )}

            <div className="pt-4 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={previousStep}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--kit-text-primary)] hover:text-[var(--kit-accent)] min-h-[44px]"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Address</span>
              </button>

              <button
                type="button"
                onClick={handleNextFromStep2}
                className="flex items-center gap-2 rounded-xl bg-[var(--kit-accent)] px-6 py-3.5 text-sm font-bold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity shadow-xs min-h-[48px]"
              >
                <span>Continue to Review</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review Order */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <OrderReview
              contact={contact}
              address={address}
              shippingMethodId={shippingMethodId}
              onEditStep={(s) => goToStep(s as CheckoutStep)}
            />

            <div className="pt-4 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={previousStep}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--kit-text-primary)] hover:text-[var(--kit-accent)] min-h-[44px]"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Shipping</span>
              </button>

              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 rounded-xl bg-[var(--kit-accent)] px-6 py-3.5 text-sm font-bold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity shadow-xs min-h-[48px]"
              >
                <span>Continue to Payment</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Payment & Submit */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Promo Code Input */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--kit-muted-fg)]">
                Have a Promo Code?
              </h3>
              <CouponInput
                appliedCoupon={promoCode || null}
                discountAmount={discountTotal}
                onApply={(code) => applyCoupon(code)}
                onRemove={removeCoupon}
              />
            </div>

            {/* Payment Method Selector */}
            <PaymentMethodSelector
              selectedProvider={paymentProvider}
              onSelectProvider={(provider) => setPaymentProvider(provider)}
            />

            {/* Place Order Button */}
            <PlaceOrderButton
              grandTotal={grandTotal}
              isSubmitting={isSubmitting}
              onClick={submitCheckout}
              providerName={paymentProvider === "bank_transfer" ? "Bank Transfer" : paymentProvider === "flutterwave" ? "Flutterwave" : "Paystack"}
            />

            <div className="pt-2">
              <button
                type="button"
                onClick={previousStep}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--kit-text-primary)] hover:text-[var(--kit-accent)] min-h-[44px]"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Order Review</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reactive Order Summary Sidebar (5 cols on desktop) */}
      <div className="lg:col-span-5 sticky top-24">
        <OrderSummary
          subtotal={subtotal}
          shippingTotal={shippingTotal}
          discountTotal={discountTotal}
          grandTotal={grandTotal}
        />
      </div>
    </div>
  );
}
