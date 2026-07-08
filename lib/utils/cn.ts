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

// ---------------------------------------------------------------------------
// Uncomment after running: npm install clsx tailwind-merge
// ---------------------------------------------------------------------------
// import { clsx, type ClassValue } from "clsx";
// import { twMerge } from "tailwind-merge";
//
// export function cn(...inputs: ClassValue[]): string {
//   return twMerge(clsx(inputs));
// }

// ---------------------------------------------------------------------------
// Temporary fallback — replace with the above after installing dependencies
// ---------------------------------------------------------------------------
type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | Record<string, boolean | undefined | null>;

function flattenClassValues(inputs: ClassValue[]): string[] {
  return inputs.flatMap((input) => {
    if (!input) return [];
    if (typeof input === "string") return [input];
    if (typeof input === "number") return [String(input)];
    if (Array.isArray(input)) return flattenClassValues(input);
    if (typeof input === "object") {
      return Object.entries(input)
        .filter(([, value]) => Boolean(value))
        .map(([key]) => key);
    }
    return [];
  });
}

/**
 * Merges class name inputs into a single string.
 * Replace with clsx + tailwind-merge once those packages are installed.
 */
export function cn(...inputs: ClassValue[]): string {
  return flattenClassValues(inputs).join(" ");
}
