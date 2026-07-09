import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface NavigationSlotProps {
  icon: React.ReactNode;
  label?: string;
  isActive?: boolean;
  onClick?: () => void;
  badge?: React.ReactNode;
}

export interface BottomNavigationProps extends React.HTMLAttributes<HTMLDivElement> {
  slots?: NavigationSlotProps[];
}

/**
 * Reusable Mobile Bottom Navigation shell component.
 * Supports up to 5 generic action slots or showcases placeholders.
 */
export function BottomNavigation({
  slots = [],
  className,
  ...props
}: BottomNavigationProps) {
  // If no slots are provided, render 4 generic slots for testing/layout setup
  const renderSlots: NavigationSlotProps[] = slots.length > 0 ? slots : [
    { icon: <div className="h-5 w-5 rounded-full border-2 border-dashed border-text-muted/60" />, label: "Slot 1", isActive: true },
    { icon: <div className="h-5 w-5 rounded-full border-2 border-dashed border-text-muted/60" />, label: "Slot 2" },
    { icon: <div className="h-5 w-5 rounded-full border-2 border-dashed border-text-muted/60" />, label: "Slot 3" },
    { icon: <div className="h-5 w-5 rounded-full border-2 border-dashed border-text-muted/60" />, label: "Slot 4" },
  ];

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-sm transition-transform",
        className
      )}
      {...props}
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-4">
        {renderSlots.map((slot, index) => (
          <button
            key={index}
            onClick={slot.onClick}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 w-16 h-12 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg",
              slot.isActive
                ? "text-accent font-semibold"
                : "text-text-secondary hover:text-text-primary"
            )}
            style={{ minHeight: "44px" }}
          >
            <div className="relative flex items-center justify-center">
              {slot.icon}
              {slot.badge && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-danger-foreground">
                  {slot.badge}
                </span>
              )}
            </div>
            {slot.label && <span className="text-[10px]">{slot.label}</span>}
          </button>
        ))}
      </div>
    </nav>
  );
}
