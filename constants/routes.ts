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

  // ---------------------------------------------------------------------------
  // Commerce (gates behind feature flags)
  // ---------------------------------------------------------------------------
  cart: "/cart",
  checkout: "/checkout",
  checkoutSuccess: "/checkout/success",

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
  },
} as const;

export type Routes = typeof ROUTES;
