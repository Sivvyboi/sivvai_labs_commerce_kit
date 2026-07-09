import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface HeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  sticky?: boolean;
}

/**
 * Reusable Mobile App Header shell component.
 * Provides left, center, and right action slots. Handles top safe-area insets automatically.
 */
export function Header({
  title,
  leftAction,
  rightAction,
  sticky = true,
  className,
  ...props
}: HeaderProps) {
  return (
    <header
      className={cn(
        "left-0 right-0 top-0 z-50 border-b border-border bg-background pt-[env(safe-area-inset-top)]",
        sticky ? "sticky" : "relative",
        className
      )}
      {...props}
    >
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        {/* Left Slot */}
        <div className="flex w-12 items-center justify-start shrink-0">
          {leftAction}
        </div>

        {/* Center Title / Logo Slot */}
        <div className="flex flex-1 items-center justify-center text-center font-semibold text-text-primary text-sm truncate px-2">
          {title}
        </div>

        {/* Right Slot */}
        <div className="flex w-12 items-center justify-end shrink-0">
          {rightAction}
        </div>
      </div>
    </header>
  );
}
