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

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./useCart";
import {
  beginCheckoutAction,
  applyPromoAction,
  initiatePaymentAction,
  verifyPaymentAction,
} from "@/features/storefront/actions/checkout.actions";
import type { InitiateCheckoutInput } from "@/lib/validation";
import type { ResolvedShippingOption } from "@/services/shipping-service";

import type { CustomerWithAddresses } from "@/lib/db/customers";
import { useCartStore } from "@/features/storefront/store/cart.store";

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

export function useCheckout(options?: { customer?: CustomerWithAddresses | null }) {
  const router = useRouter();
  const customer = options?.customer ?? null;
  const savedAddresses = useMemo(() => customer?.addresses ?? [], [customer]);
  const defaultAddress = useMemo(
    () => savedAddresses.find((a) => a.is_default) ?? savedAddresses[0] ?? null,
    [savedAddresses]
  );

  const { cart, subtotal, discountAmount: cartDiscount, appliedCoupon: cartCoupon } = useCart();

  // Lazy initializers: read persisted draft once on mount (no setState-in-effect needed)
  const [step, setStep] = useState<CheckoutStep>(() => {
    const d = readDraft();
    const s = d?.step;
    return s && [1, 2, 3, 4].includes(s as number) ? (s as CheckoutStep) : 1;
  });

  const [addressMode, setAddressMode] = useState<"saved" | "new">(() => {
    const d = readDraft();
    if (d?.addressMode === "saved" || d?.addressMode === "new") {
      return d.addressMode;
    }
    return savedAddresses.length > 0 ? "saved" : "new";
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(() => {
    const d = readDraft();
    if (typeof d?.selectedAddressId === "string" && savedAddresses.some((a) => a.id === d.selectedAddressId)) {
      return d.selectedAddressId;
    }
    return defaultAddress?.id ?? null;
  });

  const [saveAddressToAccount, setSaveAddressToAccount] = useState<boolean>(() => {
    const d = readDraft();
    return typeof d?.saveAddressToAccount === "boolean" ? d.saveAddressToAccount : false;
  });

  const [contact, setContact] = useState<ContactInfo>(() => {
    const d = readDraft();
    if (d?.contact && typeof d.contact === "object") {
      const c = d.contact as ContactInfo;
      if (c.email || c.fullName) return c;
    }
    if (customer) {
      const fullName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
      return {
        fullName: fullName || "",
        email: customer.email || "",
        phone: customer.phone || "",
      };
    }
    return { fullName: "", email: "", phone: "" };
  });

  const [address, setAddress] = useState<ShippingAddressInfo>(() => {
    const d = readDraft();
    if (d?.address && typeof d.address === "object") {
      const a = d.address as ShippingAddressInfo;
      if (a.addressLine1 || a.city) return a;
    }
    if (defaultAddress) {
      return {
        addressLine1: defaultAddress.street_line_1,
        addressLine2: defaultAddress.street_line_2 || "",
        city: defaultAddress.city,
        state: defaultAddress.state,
        country: defaultAddress.country || "NG",
      };
    }
    return {
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      country: "NG",
    };
  });

  // Shipping resolution states
  const [shippingOptions, setShippingOptions] = useState<ResolvedShippingOption[]>([]);
  const [isLoadingShippingOptions, setIsLoadingShippingOptions] = useState(false);
  const [shippingServiceable, setShippingServiceable] = useState(true);
  const [shippingReason, setShippingReason] = useState<string | undefined>(undefined);
  const [shippingError, setShippingError] = useState<string | null>(null);

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
  const [paymentStatusLabel, setPaymentStatusLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Save draft state to localStorage on update
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const draft = {
        step,
        addressMode,
        selectedAddressId,
        saveAddressToAccount,
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
    addressMode,
    selectedAddressId,
    saveAddressToAccount,
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

  // ---------------------------------------------------------------------------
  // One-shot cart-coupon → checkout-coupon sync via Zustand subscription
  //
  // Problem: useCartStore (cart.store.ts) has no `persist` middleware, so it
  // starts with appliedCoupon = null on every page load and rehydrates from the
  // server action on the first `useCart` call. The useState lazy initializer
  // above runs synchronously before that rehydration completes.
  //
  // We use a Zustand store subscription so that setState is called inside a
  // callback (not directly in the effect body), which satisfies the
  // react-hooks/set-state-in-effect rule.
  //
  // The "hasSynced" ref ensures we only copy the cart coupon once — preventing
  // this from overwriting a coupon the user manually enters on this page later.
  // ---------------------------------------------------------------------------
  const hasSyncedCartCoupon = React.useRef(false);
  useEffect(() => {
    // Eagerly sync if the store already has a coupon when the effect first mounts.
    const snap = useCartStore.getState();
    if (!hasSyncedCartCoupon.current && snap.appliedCoupon && !promoCode) {
      hasSyncedCartCoupon.current = true;
      setPromoCode(snap.appliedCoupon);
      setDiscountTotal(snap.discountAmount ?? 0);
    }

    // Subscribe for the async rehydration case (cart store loads after mount).
    const unsub = useCartStore.subscribe((state) => {
      if (!hasSyncedCartCoupon.current && state.appliedCoupon && !promoCode) {
        hasSyncedCartCoupon.current = true;
        setPromoCode(state.appliedCoupon);
        setDiscountTotal(state.discountAmount ?? 0);
      }
    });

    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount; promoCode intentionally excluded (stale-ref pattern)

  // ---------------------------------------------------------------------------
  // Authoritative Shipping Option Fetcher
  // ---------------------------------------------------------------------------
  const fetchShippingOptionsForAddress = useCallback(
    async (targetAddr: ShippingAddressInfo, currentSubtotal: number) => {
      if (!targetAddr.state && !targetAddr.city) {
        return;
      }

      setIsLoadingShippingOptions(true);
      setShippingError(null);

      try {
        const query = new URLSearchParams({
          state: targetAddr.state || "",
          city: targetAddr.city || "",
          country: targetAddr.country || "NG",
          subtotal: String(currentSubtotal || 0),
        });

        const res = await fetch(`/api/shipping/methods?${query.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }).then((r) => r.json());

        if (res.success && res.serviceable) {
          const opts: ResolvedShippingOption[] = res.options ?? [];
          setShippingOptions(opts);
          setShippingServiceable(true);
          setShippingReason(undefined);

          setShippingMethodId((prevSelected) => {
            const stillValid = opts.find((o) => o.methodId === prevSelected);
            if (stillValid) {
              setShippingTotal(stillValid.amount);
              return prevSelected;
            } else if (opts.length > 0) {
              setShippingTotal(opts[0].amount);
              return opts[0].methodId;
            } else {
              setShippingTotal(0);
              return null;
            }
          });
        } else {
          setShippingOptions([]);
          setShippingServiceable(false);
          setShippingReason(res.reason ?? "unserviceable");
          setShippingMethodId(null);
          setShippingTotal(0);
        }
      } catch (err) {
        setShippingOptions([]);
        setShippingServiceable(false);
        setShippingError(err instanceof Error ? err.message : "Failed to resolve shipping options");
        setShippingMethodId(null);
        setShippingTotal(0);
      } finally {
        setIsLoadingShippingOptions(false);
      }
    },
    []
  );

  const refreshShippingOptions = useCallback(
    async (overrideAddress?: ShippingAddressInfo) => {
      const targetAddr = overrideAddress ?? address;
      await fetchShippingOptionsForAddress(targetAddr, subtotal);
    },
    [address, subtotal, fetchShippingOptionsForAddress]
  );

  // Automatically refresh shipping options whenever we enter step 2 or the address state/city changes
  useEffect(() => {
    let ignore = false;

    if ((step >= 2 || defaultAddress) && (address.state || address.city)) {
      const runFetch = async () => {
        setIsLoadingShippingOptions(true);
        setShippingError(null);

        try {
          const query = new URLSearchParams({
            state: address.state || "",
            city: address.city || "",
            country: address.country || "NG",
            subtotal: String(subtotal || 0),
          });

          const res = await fetch(`/api/shipping/methods?${query.toString()}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }).then((r) => r.json());

          if (ignore) return;

          if (res.success && res.serviceable) {
            const opts: ResolvedShippingOption[] = res.options ?? [];
            setShippingOptions(opts);
            setShippingServiceable(true);
            setShippingReason(undefined);

            setShippingMethodId((prevSelected) => {
              const stillValid = opts.find((o) => o.methodId === prevSelected);
              if (stillValid) {
                setShippingTotal(stillValid.amount);
                return prevSelected;
              } else if (opts.length > 0) {
                setShippingTotal(opts[0].amount);
                return opts[0].methodId;
              } else {
                setShippingTotal(0);
                return null;
              }
            });
          } else {
            setShippingOptions([]);
            setShippingServiceable(false);
            setShippingReason(res.reason ?? "unserviceable");
            setShippingMethodId(null);
            setShippingTotal(0);
          }
        } catch (err) {
          if (ignore) return;
          setShippingOptions([]);
          setShippingServiceable(false);
          setShippingError(err instanceof Error ? err.message : "Failed to resolve shipping options");
          setShippingMethodId(null);
          setShippingTotal(0);
        } finally {
          if (!ignore) {
            setIsLoadingShippingOptions(false);
          }
        }
      };

      runFetch();
    }

    return () => {
      ignore = true;
    };
  }, [step, address.state, address.city, address.country, subtotal, defaultAddress]);

  // Step Navigation Controls
  const goToStep = useCallback(
    (targetStep: CheckoutStep) => {
      setErrorMessage(null);
      setStep(targetStep);
      if (targetStep === 2) {
        refreshShippingOptions();
      }
    },
    [refreshShippingOptions]
  );

  const nextStep = useCallback(() => {
    setErrorMessage(null);
    setStep((prev) => {
      const next = Math.min(4, prev + 1) as CheckoutStep;
      if (next === 2) {
        refreshShippingOptions();
      }
      return next;
    });
  }, [refreshShippingOptions]);

  const previousStep = useCallback(() => {
    setErrorMessage(null);
    setStep((prev) => Math.max(1, prev - 1) as CheckoutStep);
  }, []);

  // Form Handlers
  const updateContact = useCallback((info: Partial<ContactInfo>) => {
    setContact((prev) => ({ ...prev, ...info }));
  }, []);

  const updateAddress = useCallback((addr: Partial<ShippingAddressInfo>) => {
    setAddress((prev) => {
      const next = { ...prev, ...addr };
      return next;
    });
  }, []);

  // Address Mode Handlers
  const selectSavedAddress = useCallback(
    (addressId: string) => {
      const target = savedAddresses.find((a) => a.id === addressId);
      if (!target) return;

      const newAddr: ShippingAddressInfo = {
        addressLine1: target.street_line_1,
        addressLine2: target.street_line_2 || "",
        city: target.city,
        state: target.state,
        country: target.country || "NG",
      };

      setAddressMode("saved");
      setSelectedAddressId(addressId);
      setAddress(newAddr);
      setErrorMessage(null);

      // Refresh shipping options for newly selected saved address
      refreshShippingOptions(newAddr);
    },
    [savedAddresses, refreshShippingOptions]
  );

  const selectNewAddress = useCallback(() => {
    setAddressMode("new");
    setSelectedAddressId(null);
    setAddress({
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      country: "NG",
    });
    setShippingOptions([]);
    setShippingMethodId(null);
    setShippingTotal(0);
    setErrorMessage(null);
  }, []);

  // Shipping Selection
  const selectShippingMethod = useCallback(
    (methodId: string) => {
      setShippingMethodId(methodId);
      setErrorMessage(null);
      const matched = shippingOptions.find((o) => o.methodId === methodId);
      if (matched) {
        setShippingTotal(matched.amount);
      } else {
        setShippingTotal(0);
      }
    },
    [shippingOptions]
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

  // Final Submit & Payment Initiation (Architecture: Session -> Pre-persist Attempt -> Popup V2 -> Verify -> Confirm)
  const submitCheckout = useCallback(async () => {
    if (!cart?.id) {
      setErrorMessage("Cart session missing. Please add items to your cart.");
      return;
    }

    setIsSubmitting(true);
    setPaymentStatusLabel("Creating checkout session...");
    setErrorMessage(null);

    try {
      // 1. Begin checkout session (finds/creates customer, reserves inventory, locks totals)
      const checkoutInput: InitiateCheckoutInput = {
        cartId: cart.id,
        email: contact.email,
        fullName: contact.fullName,
        phone: contact.phone || undefined,
        savedAddressId: addressMode === "saved" && selectedAddressId ? selectedAddressId : undefined,
        saveAddressToAccount: addressMode === "new" ? saveAddressToAccount : undefined,
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

      // 2. Initiate Payment (Pre-persists attempt in DB, initializes transaction server-side)
      setPaymentStatusLabel("Initializing payment...");
      const callbackUrl = `${window.location.origin}/checkout/confirmation`;
      const payRes = await initiatePaymentAction({
        checkoutSessionId: activeSessionId,
        providerName: paymentProvider,
        callbackUrl,
      });

      if (!payRes.success) {
        throw new Error(payRes.error ?? "Failed to initiate payment");
      }

      // 3. If Paystack provider with accessCode, open Paystack Popup V2
      if (paymentProvider === "paystack" && payRes.accessCode) {
        setPaymentStatusLabel("Opening Paystack...");

        // Dynamic import of PaystackPop for Next.js browser execution
        const PaystackPopModule = await import("@paystack/inline-js");
        const PaystackPop = PaystackPopModule.default || PaystackPopModule;
        const popup = new PaystackPop();

        popup.resumeTransaction(payRes.accessCode, {
          onLoad: () => {
            setPaymentStatusLabel("Awaiting payment...");
          },
          onCancel: () => {
            setIsSubmitting(false);
            setPaymentStatusLabel(null);
            setErrorMessage("Payment was cancelled. You may try again or choose another payment method.");
          },
          onError: (error: { message?: string }) => {
            setIsSubmitting(false);
            setPaymentStatusLabel(null);
            setErrorMessage(error?.message || "Payment window failed to load.");
          },
          onSuccess: async (tx: { reference?: string }) => {
            const confirmedRef = tx.reference || payRes.reference;
            setPaymentStatusLabel("Verifying payment...");

            try {
              const verifyRes = await verifyPaymentAction({ reference: confirmedRef });
              if (!verifyRes.success) {
                throw new Error(verifyRes.error || "Payment verification failed");
              }

              setPaymentStatusLabel("Payment confirmed!");
              try {
                localStorage.removeItem(LOCAL_STORAGE_KEY);
              } catch {
                // Ignore
              }

              router.push(`/checkout/confirmation?session_id=${activeSessionId}`);
            } catch (vErr) {
              setIsSubmitting(false);
              setPaymentStatusLabel(null);
              setErrorMessage(vErr instanceof Error ? vErr.message : "Payment verification failed");
            }
          },
        });

        return;
      }

      // 4. Fallback for redirect providers (Flutterwave) or manual payment (Bank Transfer)
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        // Ignore
      }

      const authUrl = payRes.authorizationUrl;
      if (authUrl && !authUrl.includes("mock-")) {
        window.location.href = authUrl;
      } else {
        router.push(`/checkout/confirmation?session_id=${activeSessionId}`);
      }
    } catch (err) {
      setIsSubmitting(false);
      setPaymentStatusLabel(null);
      setErrorMessage(err instanceof Error ? err.message : "An error occurred during checkout");
    }
  }, [
    cart,
    contact,
    address,
    addressMode,
    selectedAddressId,
    saveAddressToAccount,
    shippingMethodId,
    promoCode,
    paymentProvider,
    router,
  ]);

  return {
    step,
    contact,
    address,
    addressMode,
    selectedAddressId,
    savedAddresses,
    saveAddressToAccount,
    shippingMethodId,
    shippingTotal,
    shippingOptions,
    isLoadingShippingOptions,
    shippingServiceable,
    shippingReason,
    shippingError,
    refreshShippingOptions,
    promoCode,
    discountTotal,
    paymentProvider,
    subtotal,
    grandTotal,
    isSubmitting,
    paymentStatusLabel,
    errorMessage,
    checkoutSessionId,
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
  };
}
