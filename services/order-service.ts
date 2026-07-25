import * as orderRepo from "@/lib/db/orders";
import * as checkoutRepo from "@/lib/db/checkout";
import * as cartRepo from "@/lib/db/carts";
import type { CartLineWithVariant } from "@/lib/db/carts";
import * as inventoryService from "./inventory-service";
import * as notificationService from "./notification-service";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { OrderLineInsert } from "@/lib/db/orders";
import type { InventoryReservationRow } from "@/lib/db/inventory";

export async function createOrderFromCheckout(
  checkoutSessionId: string,
  _paymentReference: string
) {
  // 1. Fetch checkout session
  const session = await checkoutRepo.findCheckoutSessionById(checkoutSessionId);
  if (!session) {
    throw new NotFoundError("CheckoutSession", checkoutSessionId);
  }

  if (session.status === "completed") {
    throw new ValidationError(
      "Checkout session has already been processed into an order"
    );
  }

  // 2. Fetch cart with line items
  const cart = await cartRepo.findCartById(session.cart_id);
  if (!cart || !cart.items || cart.items.length === 0) {
    throw new ValidationError("Cart for this checkout session is missing or empty");
  }

  const cartItems: CartLineWithVariant[] = cart.items;

  // 3. Build order line snapshots
  const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

  const orderLinesData: Array<Omit<OrderLineInsert, "order_id">> = cartItems.map(
    (item) => {
      const unitPrice: number =
        item.unit_price_snapshot ??
        item.variant?.price_override ??
        item.variant?.product?.base_price ??
        0;

      return {
        variant_id: item.variant_id ?? null,
        product_name_snapshot:
          item.variant?.product?.name ?? "Unknown Product",
        variant_label_snapshot: item.variant?.sku ?? "Default",
        sku_snapshot: item.variant?.sku ?? null,
        image_url_snapshot: null,
        unit_price_snapshot: unitPrice,
        quantity: item.quantity,
        line_total: unitPrice * item.quantity,
      };
    }
  );

  const subtotal = orderLinesData.reduce((s, l) => s + l.line_total, 0);

  // 4. Create order record + lines atomically
  const order = await orderRepo.createOrder(
    {
      order_number: orderNumber,
      customer_id: session.customer_id ?? null,
      guest_contact: session.guest_contact ?? null,
      status: "paid",
      shipping_address: session.shipping_address,
      billing_address: session.shipping_address,
      shipping_method_snapshot: null,
      shipping_rate_snapshot: null,
      subtotal,
      shipping_total: 0,
      discount_total: 0,
      tax_total: 0,
      grand_total: subtotal,
      currency: "NGN",
    },
    orderLinesData
  );

  // 5. Deduct inventory & mark reservations converted
  const reservations: InventoryReservationRow[] = session.inventory_reservations || [];
  for (const item of cartItems) {
    const matchedReservation = reservations.find(
      (r) => r.variant_id === item.variant_id
    );
    await inventoryService.finalizeStockDeduction({
      variantId: item.variant_id,
      quantity: item.quantity,
      orderId: order.id,
      reservationId: matchedReservation?.id,
    });
  }

  // 6. Mark checkout session completed
  await checkoutRepo.updateCheckoutSession(checkoutSessionId, {
    status: "completed",
  });

  // 7. Clear cart lines
  await cartRepo.clearCart(cart.id);

  // 8. Dispatch order notification
  if (session.customer_id) {
    await notificationService.sendOrderNotification({
      customerId: session.customer_id,
      orderId: order.id,
      channel: "email",
      recipient: "customer",
    });
  }

  return order;
}

export async function getOrderDetails(orderId: string) {
  const order = await orderRepo.findOrderById(orderId);
  if (!order) {
    throw new NotFoundError("Order", orderId);
  }
  return order;
}

export async function getCustomerOrders(customerId: string) {
  return orderRepo.findCustomerOrders(customerId);
}
