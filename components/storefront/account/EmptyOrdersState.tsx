import { EmptyState } from "@/components/shared/EmptyState";
import { PackageOpen, MapPinOff } from "lucide-react";

interface EmptyOrdersStateProps {
  type?: "orders" | "addresses";
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
}

export function EmptyOrdersState({
  type = "orders",
  title,
  description,
  actionLabel,
  actionHref,
  onActionClick,
}: EmptyOrdersStateProps) {
  const isOrders = type === "orders";

  const defaultTitle = isOrders ? "No orders found" : "No saved addresses";
  const defaultDescription = isOrders
    ? "You haven't placed any orders yet. Start exploring our products!"
    : "You don't have any saved shipping addresses yet. Add one for faster checkout.";
  const defaultActionLabel = isOrders ? "Browse Products" : "Add Address";
  const defaultActionHref = isOrders ? "/catalog" : undefined;

  return (
    <EmptyState
      icon={
        isOrders ? (
          <PackageOpen className="h-8 w-8 text-[var(--kit-accent)]" />
        ) : (
          <MapPinOff className="h-8 w-8 text-[var(--kit-accent)]" />
        )
      }
      title={title || defaultTitle}
      description={description || defaultDescription}
      action={{
        label: actionLabel || defaultActionLabel,
        href: actionHref || defaultActionHref,
        onClick: onActionClick,
      }}
    />
  );
}
