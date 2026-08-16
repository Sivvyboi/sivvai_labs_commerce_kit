/**
 * constants/routes.ts
 *
 * Typed route constants for the entire application.
 *
 * Using a single object of functions/strings prevents string literals
 * from being scattered across the codebase. If a URL path changes, update
 * it here and TypeScript will surface every usage.
 *
 * Usage:
 *   import { ROUTES } from "@/constants";
 *   <Link href={ROUTES.home}>Home</Link>
 *   redirect(ROUTES.product("my-product-slug"));
 *
 * Step 6 additions:
 *   search, collections, collection(slug), orderConfirmation(orderId),
 *   static pages (about, contact, policies)
 *
 * Note: Route groups like `(storefront)` are transparent to the URL —
 *   they only affect the Next.js file system, not the public URL path.
 */

export const ROUTES = {
  // ---------------------------------------------------------------------------
  // Storefront
  // ---------------------------------------------------------------------------
  home: "/",

  /** All products / catalog listing */
  catalog: "/catalog",

  /** Single product page. Param: product slug */
  product: (slug: string) => `/products/${slug}` as const,

  /** Product category listing. Param: category slug */
  category: (slug: string) => `/catalog/${slug}` as const,

  /**
   * Featured collections listing.
   * Collections are implemented as featured categories (see ADR in plan).
   */
  collections: "/catalog?featured=true",

  /**
   * Single collection page — routed through the category segment.
   * Param: category slug
   */
  collection: (slug: string) => `/catalog/${slug}` as const,

  /** Product search results page. Query: ?q=<term> */
  search: "/search",

  /** Helper that builds a search URL with a pre-filled query */
  searchQuery: (q: string) => `/search?q=${encodeURIComponent(q)}` as const,

  // ---------------------------------------------------------------------------
  // Commerce (gated behind feature flags)
  // ---------------------------------------------------------------------------
  cart: "/cart",
  checkout: "/checkout",

  /**
   * Order confirmation page.
   * Shown after a successful payment webhook / bank-transfer confirmation.
   * Param: orderId (UUID)
   */
  orderConfirmation: (orderId: string) =>
    `/checkout/${orderId}/confirmation` as const,

  // ---------------------------------------------------------------------------
  // Account
  // ---------------------------------------------------------------------------
  account: "/account",
  orders: "/account/orders",
  order: (id: string) => `/account/orders/${id}` as const,
  wishlist: "/account/wishlist",

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------
  auth: {
    signIn: "/auth/sign-in",
    signUp: "/auth/sign-up",
    callback: "/auth/callback",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
  },

  // ---------------------------------------------------------------------------
  // Static pages
  // ---------------------------------------------------------------------------
  about: "/about",
  contact: "/contact",
  policies: {
    privacy: "/policies/privacy",
    terms: "/policies/terms",
    shipping: "/policies/shipping",
  },

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------
  admin: {
    dashboard: "/admin",
    products: "/admin/products",
    orders: "/admin/orders",
    settings: "/admin/settings",
  },

  // ---------------------------------------------------------------------------
  // API
  // ---------------------------------------------------------------------------
  api: {
    health: "/api/health",
    products: "/api/products",
    product: (id: string) => `/api/products/${id}` as const,
    cart: "/api/cart",
    cartItems: "/api/cart/items",
    categories: "/api/categories",
    checkout: "/api/checkout",
    orders: "/api/orders",
  },
} as const;

export type Routes = typeof ROUTES;
