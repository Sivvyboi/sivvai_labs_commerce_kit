import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32;
  horizontal?: boolean;
}

/**
 * Reusable Spacer primitive to separate elements inline or vertically.
 */
export function Spacer({
  size = 4,
  horizontal = false,
  className,
  ...props
}: SpacerProps) {
  return (
    <div
      className={cn(
        "shrink-0",
        horizontal
          ? {
              "w-1": size === 1,
              "w-2": size === 2,
              "w-3": size === 3,
              "w-4": size === 4,
              "w-5": size === 5,
              "w-6": size === 6,
              "w-8": size === 8,
              "w-10": size === 10,
              "w-12": size === 12,
              "w-16": size === 16,
              "w-20": size === 20,
              "w-24": size === 24,
              "w-32": size === 32,
            }
          : {
              "h-1": size === 1,
              "h-2": size === 2,
              "h-3": size === 3,
              "h-4": size === 4,
              "h-5": size === 5,
              "h-6": size === 6,
              "h-8": size === 8,
              "h-10": size === 10,
              "h-12": size === 12,
              "h-16": size === 16,
              "h-20": size === 20,
              "h-24": size === 24,
              "h-32": size === 32,
            },
        className
      )}
      {...props}
    />
  );
}
