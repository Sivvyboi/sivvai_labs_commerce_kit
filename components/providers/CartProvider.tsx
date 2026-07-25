"use client";

/**
 * components/providers/CartProvider.tsx
 *
 * Client Component provider shell for cart state.
 *
 * In Batch 2, this is a thin wrapper that renders children.
 * In Batch 4, this will handle initial cart hydration from cookies/API.
 */

import * as React from "react";

export interface CartProviderProps {
  children: React.ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  return <>{children}</>;
}
