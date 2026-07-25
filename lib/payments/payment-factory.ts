import type { PaymentProvider } from "./payment-provider";
import { PaystackProvider } from "./paystack-provider";
import { FlutterwaveProvider } from "./flutterwave-provider";

export function getPaymentProvider(providerName?: string): PaymentProvider {
  const selected = (providerName || "paystack").toLowerCase();

  switch (selected) {
    case "flutterwave":
      return new FlutterwaveProvider();
    case "paystack":
    default:
      return new PaystackProvider();
  }
}
