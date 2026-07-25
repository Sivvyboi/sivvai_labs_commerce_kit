/**
 * features/storefront/utils/buildWhatsAppUrl.ts
 *
 * Generates an encoded WhatsApp deep-link URL for ordering items directly via WhatsApp.
 * Consumes siteConfig.contact.whatsapp and whatsappCheckout.messageTemplate.
 */

import { siteConfig } from "@/config/site";
import { whatsappCheckout } from "@/config/storefront";
import { formatCurrency } from "@/lib/utils/format";

export interface WhatsAppOrderParams {
  productName: string;
  price: number;
  productUrl?: string;
  customMessage?: string;
}

export function buildWhatsAppUrl({
  productName,
  price,
  productUrl,
  customMessage,
}: WhatsAppOrderParams): string {
  const rawNumber = siteConfig.contact.whatsapp.replace(/[^0-9]/g, "");
  if (!rawNumber) {
    return "#";
  }

  const formattedPrice = formatCurrency(price);
  const currentUrl =
    productUrl ??
    (typeof window !== "undefined"
      ? window.location.href
      : siteConfig.url);

  let message = customMessage;

  if (!message) {
    message = whatsappCheckout.messageTemplate
      .replace("{productName}", productName)
      .replace("{price}", formattedPrice)
      .replace("{url}", currentUrl);
  }

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${rawNumber}?text=${encodedMessage}`;
}
