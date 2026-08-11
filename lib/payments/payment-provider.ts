export interface InitializePaymentParams {
  amount: number;
  currency: string;
  email: string;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  reference: string;
  providerReference?: string;
}

export interface VerifyPaymentResult {
  status: "success" | "failed" | "pending";
  reference: string;
  amount: number;
  metadata?: Record<string, unknown>;
}

export interface PaymentProvider {
  name: string;
  initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult>;
  verifyPayment(reference: string): Promise<VerifyPaymentResult>;
  verifyWebhookSignature(rawPayload: string, signature: string): boolean;
}
