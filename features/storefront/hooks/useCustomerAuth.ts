"use client";

/**
 * features/storefront/hooks/useCustomerAuth.ts
 *
 * Client hook for reactive customer authentication state in storefront UI.
 * Subscribes to Supabase auth state changes and manages user info.
 */

import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/client";
import { signOutAction } from "@/features/storefront/actions/account.actions";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export interface CustomerAuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

export function useCustomerAuth(): CustomerAuthState {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createBrowserClient();

    // 1. Initial check
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser ?? null);
      setIsLoading(false);
    });

    // 2. Real-time subscription to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = React.useCallback(async () => {
    await signOutAction();
    setUser(null);
    router.push(ROUTES.home);
    router.refresh();
  }, [router]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signOut,
  };
}
