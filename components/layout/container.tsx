import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  clean?: boolean;
}

/**
 * Reusable Container primitive to center content and restrict max-width.
 */
export function Container({
  as: Component = "div",
  size = "md",
  clean = false,
  className,
  children,
  ...props
}: ContainerProps) {
  return (
    <Component
      className={cn(
        "w-full mx-auto",
        !clean && "px-4",
        {
          "max-w-md": size === "sm",
          "max-w-lg": size === "md",
          "max-w-3xl": size === "lg",
          "max-w-5xl": size === "xl",
          "max-w-none": size === "full",
        },
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
