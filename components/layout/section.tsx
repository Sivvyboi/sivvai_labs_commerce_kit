import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  spacing?: "none" | "sm" | "md" | "lg" | "xl";
  divider?: boolean;
}

/**
 * Reusable Section primitive to separate vertical blocks with consistent padding and dividers.
 */
export function Section({
  as: Component = "section",
  spacing = "md",
  divider = false,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <Component
      className={cn(
        {
          "py-0": spacing === "none",
          "py-4": spacing === "sm",
          "py-8": spacing === "md",
          "py-12": spacing === "lg",
          "py-16": spacing === "xl",
        },
        divider && "border-b border-border",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
