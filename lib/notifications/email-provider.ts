/**
 * lib/notifications/email-provider.ts
 *
 * Provider-agnostic interface for transactional email delivery.
 * Implementations (Resend, Mock, etc.) must only handle the physical transport
 * without any dependency on domain tables, orders, or business logic.
 */

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface EmailProvider {
  readonly name: string;
  send(payload: SendEmailPayload): Promise<SendEmailResult>;
}
