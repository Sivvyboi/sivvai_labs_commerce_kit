"use client";

/**
 * components/admin/ui/AdminSearch.tsx
 *
 * Debounced search input that syncs to URL query params.
 * Client Component — uses useRouter + useSearchParams.
 *
 * Usage:
 *   <AdminSearch placeholder="Search orders..." paramKey="q" />
 */

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { clsx } from "clsx";

interface AdminSearchProps {
  placeholder?: string;
  /** URL query param key to write the search value to. Default: "q" */
  paramKey?: string;
  className?: string;
}

export function AdminSearch({
  placeholder = "Search…",
  paramKey = "q",
  className,
}: AdminSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialValue = searchParams.get(paramKey) ?? "";
  const [value, setValue] = React.useState(initialValue);

  // Debounce URL sync — 350 ms after user stops typing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(paramKey, value);
      } else {
        params.delete(paramKey);
      }
      // Reset offset when search changes
      params.delete("offset");
      router.push(`${pathname}?${params.toString()}`);
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleClear() {
    setValue("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramKey);
    params.delete("offset");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className={clsx("relative flex items-center", className)}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3 text-[var(--kit-text-muted)]"
        aria-hidden
      />
      <input
        id="admin-search-input"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={clsx(
          "h-9 w-full rounded-[var(--kit-radius-md)] border border-[var(--kit-border)]",
          "bg-[var(--kit-surface)] pl-9 pr-8 text-sm",
          "text-[var(--kit-text-primary)] placeholder:text-[var(--kit-text-muted)]",
          "transition-colors focus:border-[var(--kit-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--kit-accent)]"
        )}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 flex h-4 w-4 items-center justify-center rounded-full text-[var(--kit-text-muted)] hover:text-[var(--kit-text-primary)]"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
