"use client";

/**
 * features/admin/hooks/useAdmin.ts
 *
 * Client-side hook for admin Server Actions.
 * Manages loading/error state and provides an optimistic update wrapper.
 *
 * Usage:
 *   const { execute, loading, error } = useAdmin();
 *   await execute(() => archiveProductAction(id));
 */

import * as React from "react";
import { useRouter } from "next/navigation";

interface UseAdminReturn {
  loading: boolean;
  error: string | null;
  clearError: () => void;
  /** Wraps a server action call, handling loading/error state and refreshing the RSC tree. */
  execute: <T>(
    action: () => Promise<{ success: boolean; error?: string } & T>,
    options?: {
      onSuccess?: (result: { success: boolean } & T) => void;
      /** If true, calls router.refresh() after a successful action. Default: true */
      refresh?: boolean;
    }
  ) => Promise<({ success: boolean } & T) | null>;
}

export function useAdmin(): UseAdminReturn {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const execute: UseAdminReturn["execute"] = React.useCallback(
    async (action, options = {}) => {
      const { onSuccess, refresh = true } = options;

      setLoading(true);
      setError(null);

      try {
        const result = await action();

        if (!result.success) {
          setError(result.error ?? "An unexpected error occurred");
          return null;
        }

        if (refresh) {
          router.refresh();
        }

        onSuccess?.(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const clearError = React.useCallback(() => setError(null), []);

  return { loading, error, clearError, execute };
}
