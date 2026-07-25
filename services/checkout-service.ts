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
  const cart = await cartService.getCart(input.cartId);
  if (!cart.items || cart.items.length === 0) {
    throw new ValidationError("Cannot initiate checkout with an empty cart");
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

  // 3. Calculate shipping if a fulfilment method is specified
  let shippingTotal = 0;
  if (input.shippingMethodId) {
    shippingTotal = await shippingService.calculateShippingRate(
      input.shippingMethodId,
      cart.subtotal
    );
  }

  // 4. Validate promo code if provided
  let discountTotal = 0;
  if (input.promoCode) {
    const promoResult = await promotionService.validateAndApplyPromoCode(
      input.promoCode,
      cart.subtotal
    );
    discountTotal = promoResult.discountAmount;
  }

  // 5. Create checkout_session
  const session = await checkoutRepo.createCheckoutSession({
    customer_id: customer.id,
    cart_id: cart.id,
    guest_contact: null,
    payment_method: null,
    idempotency_key: null,
    shipping_address: input.shippingAddress as Json,
    fulfilment_method_id: input.shippingMethodId ?? null,
    promo_code: input.promoCode ?? null,
    status: "pending",
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
