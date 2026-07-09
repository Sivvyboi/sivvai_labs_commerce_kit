import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Stack } from "@/components/layout/stack";
import { Container } from "@/components/layout/container";

/**
 * LoadingView component showing a modern, responsive skeleton block layout.
 */
export function LoadingView() {
  return (
    <Container size="sm" className="py-8">
      <Stack gap={6}>
        {/* Banner Skeleton */}
        <Skeleton className="h-44 w-full rounded-xl" />

        {/* Header Text Skeleton */}
        <Stack gap={2}>
          <Skeleton className="h-7 w-2/3 rounded-md" />
          <Skeleton className="h-4 w-1/3 rounded-md" />
        </Stack>

        {/* Product Grid Skeleton */}
        <Stack gap={4} className="mt-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-4 items-center border border-border/40 p-3 rounded-lg">
              <Skeleton className="h-16 w-16 rounded-md shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
              </div>
            </div>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
