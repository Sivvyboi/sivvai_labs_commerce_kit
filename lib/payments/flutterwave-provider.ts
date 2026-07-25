import type {
  PaymentProvider,
  InitializePaymentParams,
  InitializePaymentResult,
  VerifyPaymentResult,
} from "./payment-provider";

export class FlutterwaveProvider implements PaymentProvider {
  readonly name = "flutterwave";
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY || "";
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    if (!this.secretKey) {
      return {
        authorizationUrl: `https://checkout.flutterwave.com/v3/hosted/pay/mock-${params.reference}`,
        reference: params.reference,
      };
    }

    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: params.reference,
        amount: params.amount,
        currency: params.currency || "NGN",
        redirect_url: params.callbackUrl,
        customer: { email: params.email },
        meta: params.metadata,
      }),
    });

    const data = await response.json();
    if (data.status !== "success") {
      throw new Error(`Flutterwave initialization failed: ${data.message}`);
    }

    return {
      authorizationUrl: data.data.link,
      reference: params.reference,
    };
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    if (!this.secretKey) {
      return {
        status: "success",
        reference,
        amount: 0,
      };
    }

    const response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    const data = await response.json();

    if (data.status !== "success") {
      return { status: "failed", reference, amount: 0 };
    }

    return {
      status: data.data.status === "successful" ? "success" : "failed",
      reference: data.data.tx_ref,
      amount: data.data.amount,
      metadata: data.data.meta,
    };
  }

  verifyWebhookSignature(_payload: string | Record<string, unknown>, signature: string): boolean {
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    if (!secretHash) return true;
    return signature === secretHash;
  }
}
