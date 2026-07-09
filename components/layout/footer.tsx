import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Container } from "./container";
import { Stack } from "./stack";

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  brandName?: string;
}

/**
 * Reusable Mobile-first Footer component.
 * Displays simple branding, copyright, policies, and is centered.
 */
export function Footer({
  brandName = "Sivvai Labs",
  className,
  ...props
}: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "border-t border-border bg-surface py-8 text-center text-text-muted",
        className
      )}
      {...props}
    >
      <Container size="sm">
        <Stack gap={3} align="center">
          <p className="text-xs">
            © {currentYear} {brandName}. All rights reserved.
          </p>
          <div className="flex gap-4 text-[11px]">
            <a href="#" className="hover:text-text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-text-primary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-text-primary transition-colors">
              Help Support
            </a>
          </div>
          <p className="text-[10px] text-text-muted/60 mt-1">
            Powered by Sivvai Labs Commerce Kit
          </p>
        </Stack>
      </Container>
    </footer>
  );
}
