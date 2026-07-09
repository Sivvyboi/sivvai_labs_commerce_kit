import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Stack } from "@/components/layout/stack";

export interface ErrorViewProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  actionText?: string;
}

/**
 * Reusable ErrorView component for network, database, or validation issues.
 */
export function ErrorView({
  title = "Something went wrong",
  description = "We encountered an unexpected error. Please check your connection and try again.",
  onRetry,
  actionText = "Try Again",
}: ErrorViewProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center">
      <Card className="w-full max-w-sm border-danger/20 bg-danger/5 shadow-sm">
        <CardContent className="pt-6">
          <Stack gap={4} align="center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <Stack gap={2}>
              <h3 className="text-md font-bold text-text-primary leading-tight">
                {title}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {description}
              </p>
            </Stack>

            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-2 border-danger/30 text-danger hover:bg-danger/10"
              >
                {actionText}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </div>
  );
}
