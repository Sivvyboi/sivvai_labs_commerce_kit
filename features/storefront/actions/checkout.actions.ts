"use server";

/**
 * features/storefront/actions/checkout.actions.ts
 *
 * Server Actions for the storefront checkout flow.
 * Connects UI forms to domain services (checkout, shipping, promotion, payment).
 */

import * as checkoutService from "@/services/checkout-service";
import * as shippingService from "@/services/shipping-service";
import * as promotionService from "@/services/promotion-service";
import * as paymentService from "@/services/payment-service";
import type { InitiateCheckoutInput } from "@/lib/validation";

/**
 * Validates cart, resolves customer, creates checkout session, and reserves inventory.
 */
export async function beginCheckoutAction(input: InitiateCheckoutInput) {
  try {
    const result = await checkoutService.initiateCheckout(input);
    return { success: true, ...result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to initiate checkout session",
    };
  }
}

/**
 * Fetches an existing checkout session by ID for session restoration on page reload.
 */
export async function getCheckoutSessionAction(id: string) {
  try {
    const session = await checkoutService.getCheckoutSession(id);
    return { success: true, session };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Checkout session not found",
    };
  }
}

/**
 * Resolves available shipping options for a given customer destination address.
 */
export async function getShippingOptionsForAddressAction(
  destination: { state?: string; city?: string; country?: string },
  subtotal: number
) {
  try {
    const result = await shippingService.resolveShippingOptionsForAddress(
      destination,
      subtotal
    );
    return { success: true, ...result };
  } catch (err) {
    return {
      success: false,
      serviceable: false,
      reason: "unserviceable" as const,
      options: [],
      error: err instanceof Error ? err.message : "Failed to resolve shipping options",
    };
  }
}

/**
 * Calculates shipping rate for a selected fulfilment method and cart subtotal.
 */
export async function calculateShippingAction(
  methodId: string,
  subtotal: number,
  destination?: { state?: string; city?: string } | string
) {
  try {
    const rate = await shippingService.calculateShippingRate(
      methodId,
      subtotal,
      destination
    );
    return { success: true, rate };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to calculate shipping rate",
    };
  }
}

/**
 * Validates and applies a promotion code to the current cart subtotal.
 */
export async function applyPromoAction(promoCode: string, subtotal: number) {
  try {
    const result = await promotionService.validateAndApplyPromoCode(promoCode, subtotal);
    return {
      success: true,
      discountAmount: result.discountAmount,
      promoCode: result.coupon.code,
    };
  } catch (err) {
    return {
      success: false,
      discountAmount: 0,
      error: err instanceof Error ? err.message : "Invalid promotion code",
    };
  }
}

/**
 * Initiates payment with the selected provider (Paystack, Flutterwave, Bank Transfer).
 * Creates payment attempt and returns authorization redirect URL.
 */
export async function initiatePaymentAction(params: {
  checkoutSessionId: string;
  providerName?: string;
  callbackUrl?: string;
}) {
  try {
    const result = await paymentService.initiatePayment(params);
    return { success: true, ...result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to initiate payment",
    };
  }
}
