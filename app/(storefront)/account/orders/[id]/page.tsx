import { notFound } from "next/navigation";
import * as orderRepo from "@/lib/db/orders";
import { OrderDetailClient } from "./OrderDetailClient";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export async function generateMetadata({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const order = await orderRepo.findOrderById(id);
  return {
    title: order ? `Order #${order.order_number}` : "Order Not Found",
    description: order
      ? `Track the status and details of order #${order.order_number}.`
      : "Order not found.",
  };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const order = await orderRepo.findOrderById(id);

  if (!order) {
    notFound();
  }

  return <OrderDetailClient order={order} />;
}
