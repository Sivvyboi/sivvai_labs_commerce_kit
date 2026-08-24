"use client";

/**
 * components/providers/AccountProvider.tsx
 *
 * Thin client context that makes the server-fetched customer object
 * available to any client component inside the account layout.
 */

import * as React from "react";
import type { CustomerWithAddresses } from "@/lib/db/customers";

interface AccountContextValue {
  customer: CustomerWithAddresses;
}

const AccountContext = React.createContext<AccountContextValue | null>(null);

export function AccountProvider({
  customer,
  children,
}: {
  customer: CustomerWithAddresses;
  children: React.ReactNode;
}) {
  return (
    <AccountContext.Provider value={{ customer }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountContext(): AccountContextValue {
  const ctx = React.useContext(AccountContext);
  if (!ctx) {
    throw new Error("useAccountContext must be used inside <AccountProvider>");
  }
  return ctx;
}
