import type { OrderLineRow } from "@/lib/db/orders";
import { Price } from "@/components/shared/Price";
import { Package } from "lucide-react";

interface OrderItemsListProps {
  lines: OrderLineRow[];
}

export function OrderItemsList({ lines }: OrderItemsListProps) {
  return (
    <div className="space-y-4 p-5 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)]">
      <h4 className="font-bold text-sm text-[var(--kit-text-primary)] uppercase tracking-wider pb-3 border-b border-[var(--kit-border)]">
        Ordered Items ({lines.length})
      </h4>

      <div className="divide-y divide-[var(--kit-border)]">
        {lines.map((line) => (
          <div key={line.id} className="py-3 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-[var(--kit-surface)] border border-[var(--kit-border)] flex items-center justify-center text-[var(--kit-muted-fg)] shrink-0 overflow-hidden">
                {line.image_url_snapshot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={line.image_url_snapshot}
                    alt={line.product_name_snapshot}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-6 w-6 text-[var(--kit-accent)]" />
                )}
              </div>
              <div className="space-y-0.5">
                <p className="font-semibold text-[var(--kit-text-primary)] text-sm">
                  {line.product_name_snapshot}
                </p>
                {line.variant_label_snapshot && (
                  <p className="text-[var(--kit-muted-fg)] text-[11px]">
                    Variant: {line.variant_label_snapshot}
                  </p>
                )}
                {line.sku_snapshot && (
                  <p className="text-[var(--kit-muted-fg)] text-[10px]">
                    SKU: {line.sku_snapshot}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right space-y-0.5 shrink-0">
              <Price amount={Number(line.line_total) / 100} className="font-bold text-sm text-[var(--kit-text-primary)]" />
              <p className="text-[11px] text-[var(--kit-muted-fg)]">
                {line.quantity} × <Price amount={Number(line.unit_price_snapshot) / 100} />
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
