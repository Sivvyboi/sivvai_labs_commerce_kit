import * as orderRepo from "@/lib/db/orders";
import * as cartRepo from "@/lib/db/carts";
import * as inventoryService from "./inventory-service";
import * as notificationService from "./notification-service";
import { NotFoundError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";


/**
 * Creates an order from a completed checkout session atomically via Postgres RPC.
 *
 * Invariant: Either the entire operation succeeds (order + lines + inventory
 * deduction + session completion + cart clear), or nothing happens (full rollback).
 *
 * There is no sequential fallback. If the RPC is unavailable, the operation fails
 * explicitly so that no partial state is created.
 */
export async function createOrderFromCheckout(
  checkoutSessionId: string,
  paymentReference: string
) {
  const supabase = createAdminClient();

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "create_order_from_checkout_rpc",
    {
      p_checkout_session_id: checkoutSessionId,
      p_payment_reference: paymentReference,
    }
  );

  if (rpcError) {
    throw new Error(
      `Order creation failed (RPC error): ${rpcError.message}. ` +
      `checkout_session_id=${checkoutSessionId}`
    );
  }

  if (!rpcData) {
    throw new Error(
      `Order creation returned no data for checkout_session_id=${checkoutSessionId}`
    );
  }

  const order = rpcData as unknown as orderRepo.OrderWithLines;

  // Dispatch notification outside the transaction boundary — a notification
  // failure must never roll back the order.
  if (order?.id) {
    try {
      await notificationService.sendOrderNotification({
        customerId: order.customer_id,
        orderId: order.id,
        channel: "email",
        eventType: "order.created",
      });
    } catch {
      // Notification failures are non-fatal; order is already committed.
    }
  }

  return order;
}


export async function getOrderDetails(
  orderId: string,
  options?: { useAdmin?: boolean }
) {
  const order = await orderRepo.findOrderById(orderId, options);
  if (!order) {
    throw new NotFoundError("Order", orderId);
  }
  return order;
}

export async function getCustomerOrders(customerId: string) {
  return orderRepo.findCustomerOrders(customerId);
}

export async function lookupGuestOrder(
  orderNumber: string,
  email: string,
  options?: { useAdmin?: boolean }
) {
  const order = await orderRepo.findOrderByNumberAndEmail(orderNumber, email, options);
  if (!order) {
    throw new NotFoundError("Order", `${orderNumber} for email ${email}`);
  }
  return order;
}

export interface ReorderResult {
  addedCount: number;
  skippedItems: Array<{ productName: string; reason: string }>;
}

export async function reorderItemsFromOrder(
  orderId: string,
  cartId: string,
  options?: { useAdmin?: boolean }
): Promise<ReorderResult> {
  const order = await getOrderDetails(orderId, options);
  const skippedItems: Array<{ productName: string; reason: string }> = [];
  let addedCount = 0;

  for (const line of order.lines) {
    if (!line.variant_id) {
      skippedItems.push({
        productName: line.product_name_snapshot,
        reason: "Item variant is no longer available",
      });
      continue;
    }

    try {
      // Verify inventory availability before adding
      await inventoryService.verifyStockAvailability(line.variant_id, line.quantity);
      await cartRepo.addCartItem(
        {
          cartId,
          variantId: line.variant_id,
          quantity: line.quantity,
          unitPriceSnapshot: line.unit_price_snapshot,
        },
        { useAdmin: true }
      );
      addedCount++;
    } catch (err) {
      skippedItems.push({
        productName: line.product_name_snapshot,
        reason: err instanceof Error ? err.message : "Out of stock or unavailable",
      });
    }
  }

  return { addedCount, skippedItems };
}

// ---------------------------------------------------------------------------
// Admin service functions
// ---------------------------------------------------------------------------

export async function getAllOrders(params: orderRepo.FindAllOrdersParams = {}) {
  return orderRepo.findAllOrders(params);
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  note?: string | null,
  actor = "admin"
) {
  return orderRepo.updateOrderStatus(orderId, status, { actor, note });
}

export async function addOrderNote(
  orderId: string,
  note: string,
  authorType = "admin"
) {
  return orderRepo.insertOrderNote({
    order_id: orderId,
    body: note,
    author_type: authorType,
  });
}
