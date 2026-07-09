import * as React from "react";
import { Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stack } from "@/components/layout/stack";
import Link from "next/link";

export interface ComingSoonViewProps {
  featureName?: string;
  description?: string;
  actionHref?: string;
  actionText?: string;
}

/**
 * Reusable ComingSoonView component to stub future pages (e.g. checkout, profile).
 */
export function ComingSoonView({
  featureName = "This feature",
  description = "We are currently building this part of the storefront. Check back soon!",
  actionHref = "/",
  actionText = "Back to Storefront",
}: ComingSoonViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <Stack gap={5} align="center" className="max-w-xs">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Hourglass className="h-6 w-6" />
        </div>

        <Stack gap={2}>
          <h2 className="text-lg font-bold text-text-primary">
            {featureName} Coming Soon
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            {description}
          </p>
        </Stack>

        <Button asChild variant="outline" size="sm" className="mt-2 w-full">
          <Link href={actionHref}>
            {actionText}
          </Link>
        </Button>
      </Stack>
    </div>
  );
}
