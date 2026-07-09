/**
 * lib/utils/cn.ts
 *
 * Class name utility: merges Tailwind CSS classes without conflicts.
 *
 * Uses `clsx` for conditional class merging and `tailwind-merge` to resolve
 * Tailwind utility conflicts (e.g., "p-4 p-6" → "p-6").
 *
 * Usage:
 *   import { cn } from "@/lib/utils/cn";
 *   <div className={cn("p-4 text-sm", isActive && "font-bold", className)} />
 *
 * TODO: Install clsx and tailwind-merge:
 *   npm install clsx tailwind-merge
 *
 * Until installed, a basic string-join fallback is exported so TypeScript
 * compiles and the placeholder pages render without errors.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names dynamically, resolving conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
