/**
 * app/admin/(protected)/team/page.tsx
 *
 * Team Overview Page — redirects to Members tab.
 */

import { redirect } from "next/navigation";

export default function TeamPage() {
  redirect("/admin/team/members");
}
