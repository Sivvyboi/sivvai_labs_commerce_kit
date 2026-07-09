import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  direction?: "row" | "col" | "row-reverse" | "col-reverse";
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;
  align?: "start" | "end" | "center" | "baseline" | "stretch";
  justify?: "start" | "end" | "center" | "between" | "around" | "evenly";
  wrap?: boolean;
}

/**
 * Reusable Stack primitive for flex-based structures.
 */
export function Stack({
  as: Component = "div",
  direction = "col",
  gap = 4,
  align,
  justify,
  wrap = false,
  className,
  children,
  ...props
}: StackProps) {
  return (
    <Component
      className={cn(
        "flex",
        {
          "flex-row": direction === "row",
          "flex-col": direction === "col",
          "flex-row-reverse": direction === "row-reverse",
          "flex-col-reverse": direction === "col-reverse",
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
        align && {
          "items-start": align === "start",
          "items-end": align === "end",
          "items-center": align === "center",
          "items-baseline": align === "baseline",
          "items-stretch": align === "stretch",
        },
        justify && {
          "justify-start": justify === "start",
          "justify-end": justify === "end",
          "justify-center": justify === "center",
          "justify-between": justify === "between",
          "justify-around": justify === "around",
          "justify-evenly": justify === "evenly",
        },
        wrap && "flex-wrap",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
