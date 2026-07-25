import { z } from "zod";

export const PaymentInitiateSchema = z.object({
  checkoutSessionId: z.string().uuid("Invalid checkout session ID"),
  provider: z.enum(["paystack", "flutterwave", "moniepoint"]).optional(),
});

export type PaymentInitiateInput = z.infer<typeof PaymentInitiateSchema>;

export const WebhookPayloadSchema = z.object({
  event: z.string(),
  data: z.record(z.string(), z.unknown()),
});

export type WebhookPayloadInput = z.infer<typeof WebhookPayloadSchema>;
