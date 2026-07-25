/**
 * config/content.ts
 *
 * Static page content for merchant-editable pages.
 *
 * Merchants edit this file to update the About, Contact, and Policy pages
 * without touching any JSX components. All values are plain strings or
 * arrays of plain strings — no React, no markdown parser required.
 *
 * Implementation note:
 *   Each page component imports its slice from this file and renders it
 *   directly. Sections with `enabled: false` are not rendered.
 */

// ---------------------------------------------------------------------------
// About Page
// ---------------------------------------------------------------------------

export const aboutContent = {
  /** Browser tab title suffix (combined with siteConfig.name). */
  pageTitle: "About Us",
  metaDescription:
    "Learn about our story, our mission, and why thousands of Nigerians trust us for quality fashion and fast delivery.",

  hero: {
    heading: "We believe fashion should be for everyone.",
    subheading:
      "Founded in Lagos, we set out to make premium styles accessible to every Nigerian — with delivery you can actually count on.",
  },

  story: {
    enabled: true,
    heading: "Our Story",
    paragraphs: [
      "It started with a frustration. Great products existed, but getting them from social media to your door was always an ordeal. We built this store to change that.",
      "Today we serve customers across Nigeria, from Lagos Island to Kano, with a growing catalogue of carefully curated fashion and lifestyle products.",
      "Every item is quality-checked before it ships. Every order is tracked. And our WhatsApp support team is always one message away.",
    ],
  },

  values: {
    enabled: true,
    heading: "What We Stand For",
    items: [
      {
        icon: "Star",
        label: "Quality First",
        description:
          "We only stock products we would happily give to a friend.",
      },
      {
        icon: "Zap",
        label: "Speed Matters",
        description: "Same-day Lagos delivery. 2–4 days nationwide.",
      },
      {
        icon: "Heart",
        label: "Customer Love",
        description: "Real humans on WhatsApp — not bots.",
      },
    ],
  },

  faq: {
    enabled: true,
    heading: "Frequently Asked Questions",
    items: [
      {
        question: "How fast do you deliver?",
        answer:
          "Lagos Island and Mainland: same-day for orders placed before 12pm. Other states: 2–4 business days.",
      },
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept card payments via Paystack and Flutterwave, as well as bank transfers.",
      },
      {
        question: "Can I return an item?",
        answer:
          "Yes. We have a 7-day return policy on unworn items in original condition. Contact us on WhatsApp to start a return.",
      },
    ],
  },
} as const;

// ---------------------------------------------------------------------------
// Contact Page
// ---------------------------------------------------------------------------

export const contactContent = {
  pageTitle: "Contact Us",
  metaDescription:
    "Get in touch with our team. We're available on WhatsApp, email, and phone.",

  hero: {
    heading: "We'd love to hear from you.",
    subheading: "Reach us through any channel below — we typically respond within 1 hour.",
  },

  channels: [
    {
      icon: "MessageCircle",
      label: "WhatsApp",
      description: "Fastest response. Available 8am – 10pm daily.",
      /** Populated from siteConfig.contact.whatsapp at render time. */
      valueFromConfig: "whatsapp" as const,
      ctaLabel: "Chat on WhatsApp",
    },
    {
      icon: "Mail",
      label: "Email",
      description: "For order queries and returns. Response within 24 hours.",
      valueFromConfig: "email" as const,
      ctaLabel: "Send an Email",
    },
    {
      icon: "Phone",
      label: "Phone",
      description: "Available 9am – 6pm Monday to Saturday.",
      valueFromConfig: "phone" as const,
      ctaLabel: "Call Us",
    },
  ],
} as const;

// ---------------------------------------------------------------------------
// Privacy Policy Page
// ---------------------------------------------------------------------------

export const privacyContent = {
  pageTitle: "Privacy Policy",
  metaDescription:
    "Read our privacy policy to understand how we collect, use, and protect your personal data.",
  lastUpdated: "July 2026",

  sections: [
    {
      heading: "Information We Collect",
      body: "We collect your name, email address, phone number, and delivery address when you place an order. We also collect technical data such as your IP address and browser type to improve our service.",
    },
    {
      heading: "How We Use Your Information",
      body: "We use your information to process and deliver your orders, send you order updates via email or SMS, and improve our website and services. We do not sell your personal data to third parties.",
    },
    {
      heading: "Payment Security",
      body: "All card payments are processed securely by Paystack or Flutterwave. We never store your card details on our servers.",
    },
    {
      heading: "Cookies",
      body: "We use essential cookies to maintain your shopping cart session and anonymous analytics cookies to understand how visitors use our site. You can disable non-essential cookies in your browser settings.",
    },
    {
      heading: "Your Rights",
      body: "You have the right to request a copy of your personal data, ask for it to be corrected or deleted, and object to certain types of processing. Contact us at our support email to exercise these rights.",
    },
    {
      heading: "Contact",
      body: "Questions about this policy? Email us or reach us on WhatsApp and we will be happy to help.",
    },
  ],
} as const;

// ---------------------------------------------------------------------------
// Terms of Service Page
// ---------------------------------------------------------------------------

export const termsContent = {
  pageTitle: "Terms of Service",
  metaDescription:
    "Read our terms of service to understand the rules and guidelines for using our online store.",
  lastUpdated: "July 2026",

  sections: [
    {
      heading: "Acceptance of Terms",
      body: "By placing an order or using this website you agree to these terms. If you do not agree, please do not use our service.",
    },
    {
      heading: "Orders and Payment",
      body: "All orders are subject to product availability. We reserve the right to cancel any order and refund payment if an item becomes unavailable. Prices are in Nigerian Naira (₦) and include VAT where applicable.",
    },
    {
      heading: "Delivery",
      body: "Delivery times are estimates and may be affected by factors outside our control, including public holidays and logistics partner delays. We will notify you of any significant delay.",
    },
    {
      heading: "Returns and Refunds",
      body: "Items may be returned within 7 days of delivery if they are unworn, unwashed, and in original packaging. Refunds are processed within 5–7 business days. Sale items are non-returnable.",
    },
    {
      heading: "Intellectual Property",
      body: "All content on this website, including images, text, and logos, is the property of this store. You may not copy or reproduce content without written permission.",
    },
    {
      heading: "Limitation of Liability",
      body: "To the fullest extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of this website or products purchased from us.",
    },
  ],
} as const;

// ---------------------------------------------------------------------------
// Shipping Policy Page
// ---------------------------------------------------------------------------

export const shippingContent = {
  pageTitle: "Shipping Policy",
  metaDescription:
    "Learn about our delivery options, shipping times, and rates across Nigeria.",
  lastUpdated: "July 2026",

  intro:
    "We ship to all 36 states in Nigeria and the FCT. Delivery times and rates vary by location.",

  options: [
    {
      label: "Lagos Same-Day Delivery",
      description:
        "Available for orders placed before 12pm Monday to Saturday. Lagos Island, Mainland, and Lekki corridors.",
      estimate: "Same day",
      rate: "From ₦1,500",
    },
    {
      label: "Lagos Standard Delivery",
      description: "Next-day delivery to all Lagos areas.",
      estimate: "1 business day",
      rate: "From ₦1,000",
    },
    {
      label: "Nationwide Standard",
      description:
        "Door-to-door delivery to all other states via our logistics partners.",
      estimate: "2–4 business days",
      rate: "From ₦2,500",
    },
    {
      label: "Free Delivery",
      description:
        "All orders over ₦15,000 qualify for free delivery anywhere in Nigeria.",
      estimate: "See above",
      rate: "Free",
    },
  ],

  notes: [
    "Delivery times are business days (Monday – Saturday, excluding public holidays).",
    "We will send you a tracking link by SMS and email once your order ships.",
    "If your package is delayed beyond the estimated time, please contact us on WhatsApp.",
  ],
} as const;
