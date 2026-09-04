import * as checkoutRepo from "@/lib/db/checkout";
import * as customerRepo from "@/lib/db/customers";
import * as cartService from "./cart-service";
import * as inventoryService from "./inventory-service";
import * as shippingService from "./shipping-service";
import * as promotionService from "./promotion-service";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { InitiateCheckoutInput } from "@/lib/validation";
import type { CustomerRow } from "@/lib/db/customers";
import type { Json } from "@/types";

export async function initiateCheckout(input: InitiateCheckoutInput) {
  // 1. Get and validate cart
  const cart = await cartService.getCart(input.cartId, { useAdmin: true });
  if (!cart.items || cart.items.length === 0) {
    throw new ValidationError("Cannot initiate checkout with an empty cart");
  }

  // 1-A. Authoritatively validate every cart line before proceeding
  for (const item of cart.items) {
    if (item.is_stale) {
      throw new ValidationError(
        item.stale_reason ||
          "One or more items in your cart are no longer available. Please update your cart before proceeding."
      );
    }

    if (!item.variant_id) {
      throw new ValidationError("Cart item is missing variant identity");
    }

    if (item.quantity <= 0) {
      throw new ValidationError("Cart item quantity must be greater than zero");
    }

    const v = item.variant;
    if (!v || v.status !== "active" || v.archived_at !== null) {
      throw new ValidationError(
        `Variant ${v?.sku || item.variant_id} is no longer available`
      );
    }

    const p = v.product;
    if (!p || p.status !== "published" || p.archived_at !== null) {
      throw new ValidationError(`Product ${p?.name || "in cart"} is no longer available`);
    }
  }

  // 2. Find or create customer
  let customer: CustomerRow | null = await customerRepo.findCustomerByEmail(input.email);
  if (!customer) {
    const nameParts = input.fullName.trim().split(" ");
    const firstName = nameParts[0] ?? input.fullName;
    const lastName = nameParts.slice(1).join(" ") || null;

    customer = await customerRepo.createCustomer({
      email: input.email,
      first_name: firstName,
      last_name: lastName,
      phone: input.phone ?? null,
      status: "active",
      auth_id: null,
    });
  }

  if (!customer) {
    throw new ValidationError("Failed to create or retrieve customer for checkout");
  }

  // 3. Resolve and verify authoritative shipping address snapshot
  let shippingAddressSnapshot = input.shippingAddress;

  if (input.savedAddressId) {
    const savedAddresses = await customerRepo.findCustomerAddresses(customer.id);
    const matchedAddress = savedAddresses.find((a) => a.id === input.savedAddressId);
    if (!matchedAddress) {
      throw new ValidationError("Selected address not found or unauthorized");
    }

    shippingAddressSnapshot = {
      addressLine1: matchedAddress.street_line_1,
      addressLine2: matchedAddress.street_line_2 || undefined,
      city: matchedAddress.city,
      state: matchedAddress.state,
      country: matchedAddress.country || "NG",
    };
  } else if (input.saveAddressToAccount && customer) {
    // Save new address to customer address book if requested
    try {
      await customerRepo.addCustomerAddress({
        customer_id: customer.id,
        label: "Delivery",
        street_line_1: input.shippingAddress.addressLine1,
        street_line_2: input.shippingAddress.addressLine2 || null,
        city: input.shippingAddress.city,
        state: input.shippingAddress.state,
        country: input.shippingAddress.country || "NG",
        is_default: false,
      });
    } catch {
      // Non-fatal if address book persistence encounters an issue during checkout
    }
  }

  // 4. Calculate shipping if a fulfilment method is specified
  let shippingTotal = 0;
  if (input.shippingMethodId) {
    shippingTotal = await shippingService.calculateShippingRate(
      input.shippingMethodId,
      cart.subtotal,
      {
        state: shippingAddressSnapshot.state,
        city: shippingAddressSnapshot.city,
        country: shippingAddressSnapshot.country,
      }
    );
  }

  // 5. Validate promo code if provided
  let discountTotal = 0;
  if (input.promoCode) {
    const promoResult = await promotionService.validateAndApplyPromoCode(
      input.promoCode,
      cart.subtotal
    );
    discountTotal = promoResult.discountAmount;
  }

  const grandTotal = Math.max(0, cart.subtotal + shippingTotal - discountTotal);

  // checkout_sessions.*_total columns are INTEGER (Naira).
  // Floating-point arithmetic in enrichCart() can produce decimals (e.g. 72999.99).
  // Round all totals to the nearest whole number before inserting.
  const session = await checkoutRepo.createCheckoutSession({
    customer_id: customer.id,
    cart_id: cart.id,
    guest_contact: null,
    payment_method: null,
    idempotency_key: null,
    shipping_address: shippingAddressSnapshot as Json,
    fulfilment_method_id: input.shippingMethodId ?? null,
    promo_code: input.promoCode ?? null,
    subtotal: Math.round(cart.subtotal),
    shipping_total: Math.round(shippingTotal),
    discount_total: Math.round(discountTotal),
    tax_total: 0,
    grand_total: Math.round(grandTotal),
    currency: "NGN",
    status: "open",
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });

  // 6. Reserve inventory for all cart items (15 min lock)
  const reservationItems = cart.items.map((item) => ({
    variantId: item.variant_id,
    quantity: item.quantity,
  }));

  const reservations = await inventoryService.reserveInventoryForCheckout(
    session.id,
    reservationItems
  );

  // 7. Return session enriched with computed totals
  return {
    checkoutSession: session,
    reservations,
    customer,
    computed: {
      subtotal: cart.subtotal,
      shippingTotal,
      discountTotal,
      grandTotal: Math.max(0, cart.subtotal + shippingTotal - discountTotal),
    },
  };
}

export async function getCheckoutSession(id: string) {
  const session = await checkoutRepo.findCheckoutSessionById(id);
  if (!session) {
    throw new NotFoundError("CheckoutSession", id);
  }
  return session;
}
