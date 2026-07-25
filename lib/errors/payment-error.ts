import { AppError } from "./app-error";

export class PaymentFailedError extends AppError {
  constructor(message: string, public readonly details?: unknown) {
    super(message, 400, "VALIDATION");
  }
}

export class PaymentVerificationError extends AppError {
  constructor(reference: string, reason?: string) {
    const msg = reason
      ? `Payment verification failed for ref ${reference}: ${reason}`
      : `Payment verification failed for ref ${reference}`;
    super(msg, 422, "VALIDATION");
  }
}
