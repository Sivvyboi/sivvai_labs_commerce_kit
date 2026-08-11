"use client";

import * as React from "react";
import { localizationConfig } from "@/config/localization";

interface CurrencyContextValue {
  currency: string;
}

const CurrencyContext = React.createContext<CurrencyContextValue>({
  currency: localizationConfig.currency,
});

export function CurrencyProvider({
  currency,
  children,
}: {
  currency?: string;
  children: React.ReactNode;
}) {
  const value = React.useMemo(
    () => ({ currency: currency || localizationConfig.currency }),
    [currency]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): string {
  const context = React.useContext(CurrencyContext);
  return context?.currency || localizationConfig.currency;
}
