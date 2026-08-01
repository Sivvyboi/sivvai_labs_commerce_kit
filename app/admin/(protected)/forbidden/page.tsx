/**
 * app/admin/(protected)/forbidden/page.tsx
 *
 * Forbidden Page — Server Component.
 * Rendered when requirePermission() redirects unauthorized admins.
 */

import React from "react";
import type { Metadata } from "next";
import { ForbiddenState } from "@/components/admin/ui/ForbiddenState";

export const metadata: Metadata = {
  title: "Access Restricted",
};

export default function ForbiddenPage() {
  return <ForbiddenState />;
}
