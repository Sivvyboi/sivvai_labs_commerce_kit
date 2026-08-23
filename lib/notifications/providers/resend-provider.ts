import type { EmailProvider, SendEmailPayload, SendEmailResult } from "../email-provider";

/**
 * Resend Email Provider implementation using standard REST API.
 * Uses native fetch so no external dependencies are required.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  private apiKey: string;
  private defaultFrom: string;

  constructor(options?: { apiKey?: string; defaultFrom?: string }) {
    this.apiKey = options?.apiKey ?? process.env.RESEND_API_KEY ?? "";
    this.defaultFrom =
      options?.defaultFrom ??
      process.env.EMAIL_FROM ??
      "Sivvai Commerce <onboarding@resend.dev>";
  }

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "RESEND_API_KEY is not configured.",
        provider: this.name,
      };
    }

    try {
      const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
      const from = payload.from || this.defaultFrom;

      const body: Record<string, unknown> = {
        from,
        to: recipients,
        subject: payload.subject,
        html: payload.html,
      };

      if (payload.text) {
        body.text = payload.text;
      }
      if (payload.replyTo) {
        body.reply_to = payload.replyTo;
      }
      if (payload.tags && payload.tags.length > 0) {
        body.tags = payload.tags;
      }
      if (payload.headers) {
        body.headers = payload.headers;
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        name?: string;
        statusCode?: number;
      };

      if (!response.ok || !data.id) {
        const errorMsg =
          data.message ||
          (data.name ? `${data.name}: ${data.message}` : `HTTP ${response.status} ${response.statusText}`);
        return {
          success: false,
          error: errorMsg,
          provider: this.name,
        };
      }

      return {
        success: true,
        messageId: data.id,
        provider: this.name,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown network error while sending email",
        provider: this.name,
      };
    }
  }
}
