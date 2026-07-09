import * as React from "react";
import { Frown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stack } from "@/components/layout/stack";
import Link from "next/link";

export interface NotFoundViewProps {
  title?: string;
  description?: string;
  actionHref?: string;
  actionText?: string;
}

/**
 * Reusable 404 / NotFoundView component.
 */
export function NotFoundView({
  title = "Page not found",
  description = "The page you are looking for doesn't exist or has been moved.",
  actionHref = "/",
  actionText = "Go to Homepage",
}: NotFoundViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <Stack gap={5} align="center" className="max-w-xs">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-text-secondary">
          <Frown className="h-7 w-7" />
        </div>

        <Stack gap={2}>
          <h2 className="text-lg font-bold text-text-primary">
            {title}
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            {description}
          </p>
        </Stack>

        <Button asChild size="sm" className="mt-2 w-full">
          <Link href={actionHref}>
            {actionText}
          </Link>
        </Button>
      </Stack>
    </div>
  );
}
