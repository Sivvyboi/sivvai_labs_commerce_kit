/**
 * app/(admin)/orders/[id]/page.tsx
 *
 * Admin Order Detail Page — Server Component.
 * Fetches order detail with lines, customer, status_events, notes, and payment_attempts.
 */

import * as React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requirePermissionPage } from "@/lib/auth/admin-guard";
import { getOrderDetails } from "@/services/order-service";
import { OrderDetailView } from "./OrderDetailView";

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AdminOrderDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderDetails(id).catch(() => null);
  return {
    title: order ? `Order ${order.order_number}` : "Order Details",
  };
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  await requirePermissionPage("view_orders");
  const { id } = await params;
  const order = await getOrderDetails(id).catch(() => null);

  if (!order) {
    notFound();
  }

  return <OrderDetailView key={`${order.id}-${order.status}`} order={order} />;
}
