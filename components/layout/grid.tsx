import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  colsSm?: 1 | 2 | 3 | 4 | 6 | 12;
  colsMd?: 1 | 2 | 3 | 4 | 6 | 12;
  colsLg?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;
}

/**
 * Reusable Grid primitive for CSS-grid structures with responsive columns.
 */
export function Grid({
  as: Component = "div",
  cols = 1,
  colsSm,
  colsMd,
  colsLg,
  gap = 4,
  className,
  children,
  ...props
}: GridProps) {
  return (
    <Component
      className={cn(
        "grid",
        {
          "grid-cols-1": cols === 1,
          "grid-cols-2": cols === 2,
          "grid-cols-3": cols === 3,
          "grid-cols-4": cols === 4,
          "grid-cols-5": cols === 5,
          "grid-cols-6": cols === 6,
          "grid-cols-12": cols === 12,
        },
        colsSm && {
          "sm:grid-cols-1": colsSm === 1,
          "sm:grid-cols-2": colsSm === 2,
          "sm:grid-cols-3": colsSm === 3,
          "sm:grid-cols-4": colsSm === 4,
          "sm:grid-cols-6": colsSm === 6,
          "sm:grid-cols-12": colsSm === 12,
        },
        colsMd && {
          "md:grid-cols-1": colsMd === 1,
          "md:grid-cols-2": colsMd === 2,
          "md:grid-cols-3": colsMd === 3,
          "md:grid-cols-4": colsMd === 4,
          "md:grid-cols-6": colsMd === 6,
          "md:grid-cols-12": colsMd === 12,
        },
        colsLg && {
          "lg:grid-cols-1": colsLg === 1,
          "lg:grid-cols-2": colsLg === 2,
          "lg:grid-cols-3": colsLg === 3,
          "lg:grid-cols-4": colsLg === 4,
          "lg:grid-cols-6": colsLg === 6,
          "lg:grid-cols-12": colsLg === 12,
        },
        {
          "gap-0": gap === 0,
          "gap-1": gap === 1,
          "gap-2": gap === 2,
          "gap-3": gap === 3,
          "gap-4": gap === 4,
          "gap-5": gap === 5,
          "gap-6": gap === 6,
          "gap-8": gap === 8,
          "gap-10": gap === 10,
          "gap-12": gap === 12,
          "gap-16": gap === 16,
        },
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
