/**
 * features/storefront/actions/newsletter.actions.ts
 *
 * Server Action: newsletter subscription stub.
 *
 * Currently logs the email server-side.
 * Connect to Mailchimp, ConvertKit, Resend, or Brevo when the
 * `featureFlag.newsletter` integration is ready.
 */

"use server";

type FormState = {
  success: boolean;
  error: string | null;
};

export async function subscribeToNewsletterAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = formData.get("email");

  if (typeof email !== "string" || !email.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  // TODO: Connect to email marketing provider (Mailchimp, Resend, etc.)
  // For now, log the subscription server-side
  console.info("[Newsletter] New subscription:", email.trim());

  return { success: true, error: null };
}
