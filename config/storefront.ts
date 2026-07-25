/**
 * config/storefront.ts
 *
 * Storefront-specific merchant configuration.
 *
 * This is the merchant's primary customisation surface for the customer-facing
 * storefront. Everything here is intentionally plain data — no framework
 * imports — so it can be edited by a non-engineer without touching any
 * component code.
 *
 * Structure:
 *  - nav          : Top-level navigation links
 *  - announcement : Dismissible site-wide banner
 *  - homepage     : Per-section visibility toggles + content overrides
 *  - footer       : Link column definitions
 *  - social       : Social media links used in header, footer, and OG tags
 *  - trust        : Benefits / trust signal strips
 *  - testimonials : Hardcoded review cards (feature-flagged)
 *  - whatsapp     : WhatsApp checkout config
 */

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export interface NavLink {
  label: string;
  href: string;
  /** Optional: highlight this link as a "sale" / promotional item */
  highlight?: boolean;
}

/** Top-level navigation links rendered in StorefrontHeader and MobileMenuDrawer. */
export const storefrontNav: NavLink[] = [
  { label: "Shop All", href: "/catalog" },
  { label: "Collections", href: "/catalog?featured=true" },
  { label: "About", href: "/about" },
];

// ---------------------------------------------------------------------------
// Announcement Banner
// ---------------------------------------------------------------------------

export interface AnnouncementBannerConfig {
  /** Set to false to hide the banner entirely. */
  enabled: boolean;
  /** The message shown in the banner. Supports plain text only. */
  message: string;
  /** Optional CTA link. If omitted, the banner is non-clickable. */
  link?: string;
  /** Link label. Defaults to "Shop Now". */
  linkLabel?: string;
}

export const announcementBanner: AnnouncementBannerConfig = {
  enabled: true,
  message: "🎉 Free delivery on orders over ₦15,000. Limited time only.",
  link: "/catalog",
  linkLabel: "Shop Now",
};

// ---------------------------------------------------------------------------
// Homepage Sections
// ---------------------------------------------------------------------------

export interface HeroConfig {
  /** Main heading text. */
  heading: string;
  /** Subheading / description text. */
  subheading: string;
  /** Primary CTA button label. */
  primaryCta: string;
  /** Primary CTA destination URL. */
  primaryCtaHref: string;
  /** Optional secondary CTA label. */
  secondaryCta?: string;
  /** Optional secondary CTA destination URL. */
  secondaryCtaHref?: string;
  /**
   * Background type.
   * - "gradient": uses the brand accent gradient (default, no image required)
   * - "image": uses a background image at `backgroundImage`
   */
  backgroundType: "gradient" | "image";
  /** Only used when backgroundType === "image". Path relative to /public */
  backgroundImage?: string;
}

export const heroConfig: HeroConfig = {
  heading: "Fashion that moves with you.",
  subheading:
    "Discover curated styles delivered fast across Nigeria. Shop what you love, pay your way.",
  primaryCta: "Shop All",
  primaryCtaHref: "/catalog",
  secondaryCta: "View Collections",
  secondaryCtaHref: "/catalog?featured=true",
  backgroundType: "gradient",
};

export interface BenefitItem {
  /** Lucide icon name (string, resolved at runtime). */
  icon: string;
  label: string;
  description: string;
}

export const benefitsConfig: BenefitItem[] = [
  {
    icon: "Truck",
    label: "Fast Delivery",
    description: "Lagos same-day · Nationwide 2–4 days",
  },
  {
    icon: "ShieldCheck",
    label: "Secure Payment",
    description: "Paystack & Flutterwave encrypted",
  },
  {
    icon: "RefreshCcw",
    label: "Easy Returns",
    description: "7-day hassle-free return policy",
  },
  {
    icon: "MessageCircle",
    label: "WhatsApp Support",
    description: "Chat with us anytime",
  },
];

export interface TestimonialItem {
  name: string;
  handle?: string;
  avatar?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
}

export const testimonialsConfig: TestimonialItem[] = [
  {
    name: "Adaeze O.",
    handle: "@adaeze_styles",
    rating: 5,
    text: "Fastest delivery I've ever experienced in Lagos. The quality is top-notch!",
  },
  {
    name: "Emeka K.",
    handle: "@emeka.k",
    rating: 5,
    text: "Ordered on a Wednesday, arrived Thursday morning. Absolutely love the brand.",
  },
  {
    name: "Chioma B.",
    handle: "@chioma.b",
    rating: 4,
    text: "Great selection and very responsive on WhatsApp. Will definitely order again.",
  },
];

export interface HomepageSectionVisibility {
  hero: boolean;
  featuredProducts: boolean;
  featuredCollections: boolean;
  categories: boolean;
  promoBanner: boolean;
  benefits: boolean;
  /** Controlled by featureFlag.testimonials */
  testimonials: boolean;
  /** Controlled by featureFlag.newsletter */
  newsletter: boolean;
}

/** Toggle individual homepage sections. */
export const homepageSections: HomepageSectionVisibility = {
  hero: true,
  featuredProducts: true,
  featuredCollections: true,
  categories: true,
  promoBanner: true,
  benefits: true,
  testimonials: true,
  newsletter: true,
};

export interface PromoBannerConfig {
  enabled: boolean;
  heading: string;
  subheading: string;
  ctaLabel: string;
  ctaHref: string;
  /** Background variant: "accent" | "primary" | "surface" */
  variant: "accent" | "primary" | "surface";
}

export const promoBannerConfig: PromoBannerConfig = {
  enabled: true,
  heading: "New Arrivals — Just Dropped",
  subheading: "Fresh styles added weekly. Be the first to shop.",
  ctaLabel: "Browse New Arrivals",
  ctaHref: "/catalog?sort=newest",
  variant: "accent",
};

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

export interface FooterLinkItem {
  label: string;
  href: string;
  /** Set true for links that open in a new tab (e.g. social links). */
  external?: boolean;
}

export interface FooterColumnConfig {
  heading: string;
  links: FooterLinkItem[];
}

export const footerColumns: FooterColumnConfig[] = [
  {
    heading: "Shop",
    links: [
      { label: "All Products", href: "/catalog" },
      { label: "Collections", href: "/catalog?featured=true" },
      { label: "New Arrivals", href: "/catalog?sort=newest" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "About Us", href: "/about" },
      { label: "FAQs", href: "/about#faq" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/policies/privacy" },
      { label: "Terms of Service", href: "/policies/terms" },
      { label: "Shipping Policy", href: "/policies/shipping" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Social Links
// ---------------------------------------------------------------------------

export interface SocialLink {
  platform: "instagram" | "whatsapp" | "tiktok" | "facebook" | "twitter";
  /** Full URL, e.g. "https://instagram.com/mybrand" */
  url: string;
}

/**
 * Social links shown in the footer and optionally the header.
 * Populated from env vars at runtime — see config/site.ts for the raw values.
 * Merchants override these in config/site.ts, not here.
 */
export const socialLinks: SocialLink[] = [
  // Links are populated dynamically from siteConfig.contact at render time.
  // This array defines the shape; StorefrontFooter builds the real list.
];

// ---------------------------------------------------------------------------
// WhatsApp Checkout
// ---------------------------------------------------------------------------

export interface WhatsAppCheckoutConfig {
  /**
   * Pre-filled WhatsApp message template.
   * Use {productName}, {price}, {url} as placeholders.
   */
  messageTemplate: string;
}

export const whatsappCheckout: WhatsAppCheckoutConfig = {
  messageTemplate:
    "Hi! I'd like to order *{productName}* — {price}. Here's the link: {url}",
};
