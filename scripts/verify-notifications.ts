/**
 * scripts/verify-notifications.ts
 *
 * Verification test suite for Phase 4.1 Transactional Notification Delivery.
 */

import { MockEmailProvider } from "../lib/notifications/providers/mock-provider";
import { ResendEmailProvider } from "../lib/notifications/providers/resend-provider";
import { getEmailProvider } from "../lib/notifications/email-factory";
import {
  renderOrderConfirmationEmail,
  renderOrderStatusUpdateEmail,
  renderAdminInvitationEmail,
} from "../lib/notifications/templates";

async function runVerification() {
  console.log("=================================================");
  console.log("Phase 4.1 Verification: Transactional Notifications");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details || ""}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Mock Email Provider Dispatch
  // -------------------------------------------------------------
  console.log("--- 1. Provider Transporter Tests ---");
  const mockProvider = new MockEmailProvider();
  const mockResult = await mockProvider.send({
    to: "customer@example.com",
    subject: "Test Order #1001",
    html: "<p>Thank you for your order!</p>",
  });

  assert(mockResult.success === true, "Mock provider returns success = true");
  assert(typeof mockResult.messageId === "string" && mockResult.messageId.startsWith("mock-msg-"), "Mock provider returns valid messageId");
  assert(mockResult.provider === "mock", "Mock provider identifier matches 'mock'");

  // -------------------------------------------------------------
  // Test 2: Mock Email Provider Failure Simulation
  // -------------------------------------------------------------
  const failingMockProvider = new MockEmailProvider({ shouldFail: true });
  const failingResult = await failingMockProvider.send({
    to: "customer@example.com",
    subject: "Test Failing Order",
    html: "<p>Test</p>",
  });

  assert(failingResult.success === false, "Failing mock provider returns success = false");
  assert(Boolean(failingResult.error), "Failing mock provider returns error message");

  // -------------------------------------------------------------
  // Test 3: Resend Provider Initialization & Safe Missing Key Handling
  // -------------------------------------------------------------
  const resendWithoutKey = new ResendEmailProvider({ apiKey: "" });
  const resendResult = await resendWithoutKey.send({
    to: "test@example.com",
    subject: "Test",
    html: "<p>Test</p>",
  });
  assert(resendResult.success === false, "Resend without API key returns structured failure");
  assert(
    Boolean(resendResult.error?.includes("RESEND_API_KEY is not configured")),
    "Resend returns clear key error"
  );

  // -------------------------------------------------------------
  // Test 4: Provider Factory Resolution
  // -------------------------------------------------------------
  const factoryMock = getEmailProvider("mock");
  assert(factoryMock.name === "mock", "Factory correctly creates mock provider");

  // -------------------------------------------------------------
  // Test 5: Template Rendering — Order Confirmation
  // -------------------------------------------------------------
  console.log("\n--- 2. Template Rendering Tests ---");
  const orderData = {
    orderNumber: "SL-98234",
    customerName: "Ada Lovelace",
    items: [
      {
        name: "Artisan Leather Tote",
        variantLabel: "Tan / Large",
        quantity: 2,
        unitPrice: 25000,
        lineTotal: 50000,
      },
      {
        name: "Minimalist Brass Pen",
        variantLabel: null,
        quantity: 1,
        unitPrice: 7500,
        lineTotal: 7500,
      },
    ],
    subtotal: 57500,
    shippingTotal: 2500,
    discountTotal: 5000,
    grandTotal: 55000,
    currency: "NGN",
    shippingAddress: {
      street_line_1: "12 Marina Road",
      city: "Lagos Island",
      state: "Lagos",
      country: "NG",
    },
    viewOrderUrl: "https://store.example.com/account/orders/test-id",
  };

  const renderedOrder = renderOrderConfirmationEmail(orderData);
  assert(renderedOrder.subject.includes("SL-98234"), "Order template subject includes order number");
  assert(renderedOrder.html.includes("Ada Lovelace"), "Order template HTML includes customer greeting");
  assert(renderedOrder.html.includes("Artisan Leather Tote"), "Order template HTML contains line items");
  assert(renderedOrder.html.includes("55,000"), "Order template HTML contains formatted grand total");
  assert(renderedOrder.html.includes("https://store.example.com/account/orders/test-id"), "Order template HTML contains CTA button link");
  assert(renderedOrder.text.includes("Artisan Leather Tote (Tan / Large) x2"), "Order plaintext output is correctly formatted");

  // -------------------------------------------------------------
  // Test 6: Template Rendering — Order Status Update
  // -------------------------------------------------------------
  const statusData = {
    orderNumber: "SL-98234",
    customerName: "Ada Lovelace",
    newStatus: "shipped",
    note: "Package handed over to DHL Express.",
    trackingNumber: "DHL-9812739120",
    carrier: "DHL Express",
    viewOrderUrl: "https://store.example.com/account/orders/test-id",
  };

  const renderedStatus = renderOrderStatusUpdateEmail(statusData);
  assert(renderedStatus.subject.includes("SHIPPED"), "Status update subject includes upper-cased status");
  assert(renderedStatus.html.includes("DHL-9812739120"), "Status update HTML contains tracking number");
  assert(renderedStatus.html.includes("Package handed over to DHL"), "Status update HTML contains custom note");

  // -------------------------------------------------------------
  // Test 7: Template Rendering — Admin Team Invitation
  // -------------------------------------------------------------
  const inviteData = {
    recipientEmail: "new-admin@example.com",
    roleName: "Store Manager",
    inviteUrl: "https://store.example.com/auth/callback?type=admin_invite&token=abc123securetoken",
    inviterEmail: "owner@example.com",
    message: "Welcome to the team! Looking forward to working together.",
    expiresInDays: 7,
  };

  const renderedInvite = renderAdminInvitationEmail(inviteData);
  assert(renderedInvite.subject.includes("Store Manager"), "Admin invitation subject includes assigned role");
  assert(renderedInvite.html.includes("owner@example.com"), "Admin invitation HTML includes inviter email");
  assert(renderedInvite.html.includes("Welcome to the team!"), "Admin invitation HTML includes personal message");
  assert(renderedInvite.html.includes("abc123securetoken"), "Admin invitation HTML includes secure token link");
  assert(renderedInvite.text.includes("Accept your invitation here:"), "Admin invitation plaintext includes instructions");

  // -------------------------------------------------------------
  // Test 8: Security Check — No Secret Leakage to Client
  // -------------------------------------------------------------
  console.log("\n--- 3. Security & Boundary Checks ---");
  const envExample = await import("fs").then((fs) =>
    fs.readFileSync(".env.example", "utf-8")
  );
  assert(
    !envExample.includes("NEXT_PUBLIC_RESEND_API_KEY"),
    "RESEND_API_KEY is server-only and NOT prefixed with NEXT_PUBLIC_"
  );
  assert(
    envExample.includes("RESEND_API_KEY="),
    ".env.example includes RESEND_API_KEY placeholder"
  );
  assert(
    envExample.includes("EMAIL_PROVIDER="),
    ".env.example includes EMAIL_PROVIDER configuration"
  );

  console.log("\n=================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("Verification failed with uncaught error:", err);
  process.exit(1);
});
