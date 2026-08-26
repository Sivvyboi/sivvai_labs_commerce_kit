import crypto from "crypto";
import { nairaToKobo, koboToNaira } from "@/lib/utils/money";
import type {
  PaymentProvider,
  InitializePaymentParams,
  InitializePaymentResult,
  VerifyPaymentResult,
} from "./payment-provider";

export class PaystackProvider implements PaymentProvider {
  readonly name = "paystack";
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || "";
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    // Return checkout URL or mock payload if key is missing in dev
    if (!this.secretKey) {
      return {
        authorizationUrl: `https://checkout.paystack.com/mock-${params.reference}`,
        reference: params.reference,
        accessCode: `mock-access-${params.reference}`,
      };
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.email,
        amount: nairaToKobo(params.amount), // convert to kobo
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });

    const data = await response.json();
    if (!data.status) {
      throw new Error(`Paystack initialization failed: ${data.message}`);
    }

    return {
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      accessCode: data.data.access_code,
    };
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    if (!this.secretKey) {
      return {
        status: "success",
        reference,
        amount: 0,
        currency: "NGN",
      };
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    const data = await response.json();

    if (!data.status) {
      return { status: "failed", reference, amount: 0 };
    }

    const isSuccess = data.data.status === "success";
    return {
      status: isSuccess ? "success" : "failed",
      reference: data.data.reference,
      amount: koboToNaira(data.data.amount),
      currency: data.data.currency || "NGN",
      metadata: data.data.metadata,
    };
  }

  verifyWebhookSignature(rawPayload: string, signature: string): boolean {
    const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET || this.secretKey;
    if (!webhookSecret || !signature) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac("sha512", webhookSecret)
        .update(rawPayload)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "utf-8"),
        Buffer.from(signature, "utf-8")
      );
    } catch {
      return false;
    }
  }
}
