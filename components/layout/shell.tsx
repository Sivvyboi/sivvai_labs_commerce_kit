import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Header } from "./header";
import { BottomNavigation, NavigationSlotProps } from "./bottom-navigation";

export interface ShellProps extends React.HTMLAttributes<HTMLDivElement> {
  headerTitle?: React.ReactNode;
  headerLeftAction?: React.ReactNode;
  headerRightAction?: React.ReactNode;
  showHeader?: boolean;
  showBottomNav?: boolean;
  bottomNavSlots?: NavigationSlotProps[];
}

/**
 * Mobile-first Frame/Shell component.
 * Centers a maximum 512px (max-w-lg) device layout on desktop viewports.
 * Embeds top headers and bottom navigation slots dynamically.
 */
export function Shell({
  children,
  headerTitle,
  headerLeftAction,
  headerRightAction,
  showHeader = true,
  showBottomNav = true,
  bottomNavSlots,
  className,
  ...props
}: ShellProps) {
  return (
    <div
      className={cn(
        "relative mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background shadow-sm md:border-x md:border-border",
        className
      )}
      {...props}
    >
      {/* Header Slot */}
      {showHeader && (
        <Header
          title={headerTitle}
          leftAction={headerLeftAction}
          rightAction={headerRightAction}
        />
      )}

      {/* Content Body */}
      <main
        className={cn(
          "flex-1 flex flex-col w-full",
          // Account for fixed bottom navigation height
          showBottomNav && "pb-20"
        )}
      >
        {children}
      </main>

      {/* Fixed Bottom Navigation Menu */}
      {showBottomNav && <BottomNavigation slots={bottomNavSlots} />}
    </div>
  );
}
