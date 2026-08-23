import { randomUUID } from "crypto";
import type { EmailProvider, SendEmailPayload, SendEmailResult } from "../email-provider";
import { logger } from "@/lib/logger";

/**
 * Mock Email Provider for local development, testing, and fallback.
 * Simulates dispatch without sending real network requests.
 */
export class MockEmailProvider implements EmailProvider {
  readonly name = "mock";
  private shouldFail: boolean;

  constructor(options?: { shouldFail?: boolean }) {
    this.shouldFail = options?.shouldFail ?? false;
  }

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    const recipients = Array.isArray(payload.to) ? payload.to.join(", ") : payload.to;

    if (this.shouldFail) {
      logger.warn(`[MockEmailProvider] Simulated email delivery failure to: ${recipients}`, {
        subject: payload.subject,
      });
      return {
        success: false,
        error: "Simulated mock provider failure",
        provider: this.name,
      };
    }

    const messageId = `mock-msg-${randomUUID()}`;
    logger.info(`[MockEmailProvider] Simulated email delivery to: ${recipients}`, {
      subject: payload.subject,
      messageId,
      from: payload.from,
    });

    return {
      success: true,
      messageId,
      provider: this.name,
    };
  }
}
