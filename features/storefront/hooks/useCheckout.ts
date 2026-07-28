"use client";

/**
 * features/storefront/hooks/useCheckout.ts
 *
 * Primary client hook managing the 4-step storefront checkout state machine:
 *  Step 1: Contact & Shipping Address
 *  Step 2: Shipping Method & Rate Calculation
 *  Step 3: Review Order
 *  Step 4: Payment Provider & Order Placement
 *
 * Persists draft progress in localStorage (`sivvai_checkout_draft`) so page
 * refreshes and step navigation preserve user input seamlessly.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./useCart";
import {
  beginCheckoutAction,
  calculateShippingAction,
  applyPromoAction,
  initiatePaymentAction,
} from "@/features/storefront/actions/checkout.actions";
import type { InitiateCheckoutInput } from "@/lib/validation";

export type CheckoutStep = 1 | 2 | 3 | 4;

export interface ContactInfo {
  fullName: string;
  email: string;
  phone: string;
}

export interface ShippingAddressInfo {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
}

const LOCAL_STORAGE_KEY = "sivvai_checkout_draft";

/** Read persisted draft from localStorage at hook initialization (runs once, synchronously). */
function readDraft() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function useCheckout() {
  const router = useRouter();
  const { cart, subtotal, discountAmount: cartDiscount, appliedCoupon: cartCoupon } = useCart();

  // Lazy initializers: read persisted draft once on mount (no setState-in-effect needed)
  const [step, setStep] = useState<CheckoutStep>(() => {
    const d = readDraft();
    const s = d?.step;
    return s && [1, 2, 3, 4].includes(s as number) ? (s as CheckoutStep) : 1;
  });
  const [contact, setContact] = useState<ContactInfo>(() => {
    const d = readDraft();
    return (d?.contact as ContactInfo) ?? { fullName: "", email: "", phone: "" };
  });
  const [address, setAddress] = useState<ShippingAddressInfo>(() => {
    const d = readDraft();
    return (d?.address as ShippingAddressInfo) ?? {
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      country: "NG",
    };
  });
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(() => {
    const d = readDraft();
    return typeof d?.shippingMethodId === "string" ? d.shippingMethodId : null;
  });
  const [shippingTotal, setShippingTotal] = useState<number>(() => {
    const d = readDraft();
    return typeof d?.shippingTotal === "number" ? d.shippingTotal : 0;
  });
  const [promoCode, setPromoCode] = useState<string>(() => {
    const d = readDraft();
    return typeof d?.promoCode === "string" ? d.promoCode : (cartCoupon ?? "");
  });
  const [discountTotal, setDiscountTotal] = useState<number>(() => {
    const d = readDraft();
    return typeof d?.discountTotal === "number" ? d.discountTotal : (cartDiscount ?? 0);
  });
  const [paymentProvider, setPaymentProvider] = useState<string>(() => {
    const d = readDraft();
    return typeof d?.paymentProvider === "string" ? d.paymentProvider : "paystack";
  });

  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(() => {
    const d = readDraft();
    return typeof d?.checkoutSessionId === "string" ? d.checkoutSessionId : null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  // Save draft state to localStorage on update
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const draft = {
        step,
        contact,
        address,
        shippingMethodId,
        shippingTotal,
        promoCode,
        discountTotal,
        paymentProvider,
        checkoutSessionId,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignore write errors
    }
  }, [
    step,
    contact,
    address,
    shippingMethodId,
    shippingTotal,
    promoCode,
    discountTotal,
    paymentProvider,
    checkoutSessionId,
  ]);

  // Recalculate grand total
  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal + shippingTotal - discountTotal);
  }, [subtotal, shippingTotal, discountTotal]);

  // Step Navigation Controls
  const goToStep = useCallback((targetStep: CheckoutStep) => {
    setErrorMessage(null);
    setStep(targetStep);
  }, []);

  const nextStep = useCallback(() => {
    setErrorMessage(null);
    setStep((prev) => Math.min(4, prev + 1) as CheckoutStep);
  }, []);

  const previousStep = useCallback(() => {
    setErrorMessage(null);
    setStep((prev) => Math.max(1, prev - 1) as CheckoutStep);
  }, []);

  // Form Handlers
  const updateContact = useCallback((info: Partial<ContactInfo>) => {
    setContact((prev) => ({ ...prev, ...info }));
  }, []);

  const updateAddress = useCallback((addr: Partial<ShippingAddressInfo>) => {
    setAddress((prev) => ({ ...prev, ...addr }));
  }, []);

  // Shipping Selection & Recalculation
  const selectShippingMethod = useCallback(
    async (methodId: string) => {
      setShippingMethodId(methodId);
      setErrorMessage(null);
      try {
        const res = await calculateShippingAction(methodId, subtotal);
        if (res.success && typeof res.rate === "number") {
          setShippingTotal(res.rate);
        }
      } catch {
        setShippingTotal(0);
      }
    },
    [subtotal]
  );

  // Promo Code Handler
  const applyCoupon = useCallback(
    async (code: string) => {
      if (!code.trim()) return;
      setErrorMessage(null);
      const res = await applyPromoAction(code.trim(), subtotal);
      if (res.success) {
        setPromoCode(res.promoCode ?? code.trim().toUpperCase());
        setDiscountTotal(res.discountAmount);
      } else {
        setErrorMessage(res.error ?? "Invalid coupon code");
      }
    },
    [subtotal]
  );

  const removeCoupon = useCallback(() => {
    setPromoCode("");
    setDiscountTotal(0);
  }, []);

  // Final Submit & Payment Initiation (Architecture B: Create Checkout Session -> Initiate Payment -> Redirect)
  const submitCheckout = useCallback(async () => {
    if (!cart?.id) {
      setErrorMessage("Cart session missing. Please add items to your cart.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Begin checkout session (finds/creates customer, reserves inventory)
      const checkoutInput: InitiateCheckoutInput = {
        cartId: cart.id,
        email: contact.email,
        fullName: contact.fullName,
        phone: contact.phone || undefined,
        shippingAddress: {
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 || undefined,
          city: address.city,
          state: address.state,
          country: address.country || "NG",
        },
        shippingMethodId: shippingMethodId || undefined,
        promoCode: promoCode || undefined,
      };

      const sessionRes = await beginCheckoutAction(checkoutInput);
      if (!sessionRes.success || !("checkoutSession" in sessionRes) || !sessionRes.checkoutSession) {
        throw new Error((sessionRes as { error?: string }).error ?? "Failed to create checkout session");
      }

      const activeSessionId = (sessionRes as { checkoutSession: { id: string } }).checkoutSession.id;
      setCheckoutSessionId(activeSessionId);

      // 2. Initiate Payment
      const callbackUrl = `${window.location.origin}/checkout/confirmation`;
      const payRes = await initiatePaymentAction({
        checkoutSessionId: activeSessionId,
        providerName: paymentProvider,
        callbackUrl,
      });

      if (!payRes.success) {
        throw new Error(payRes.error ?? "Failed to initiate payment");
      }

      // Clear draft on successful payment initiation
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        // Ignore
      }

      // If provider returns authorization URL (Paystack/Flutterwave), redirect
      const authUrl = "authorizationUrl" in payRes ? (payRes as { authorizationUrl: string }).authorizationUrl : null;
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        // Fallback for Bank Transfer / manual providers
        router.push(`/checkout/confirmation?session_id=${activeSessionId}`);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An error occurred during checkout");
    } finally {
      setIsSubmitting(false);
    }
  }, [cart, contact, address, shippingMethodId, promoCode, paymentProvider, router]);

  return {
    step,
    contact,
    address,
    shippingMethodId,
    shippingTotal,
    promoCode,
    discountTotal,
    paymentProvider,
    subtotal,
    grandTotal,
    isSubmitting,
    errorMessage,
    checkoutSessionId,
    goToStep,
    nextStep,
    previousStep,
    updateContact,
    updateAddress,
    selectShippingMethod,
    applyCoupon,
    removeCoupon,
    setPaymentProvider,
    submitCheckout,
  };
}
