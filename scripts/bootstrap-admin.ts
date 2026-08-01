/**
 * scripts/bootstrap-admin.ts
 *
 * CLI Utility to bootstrap an initial admin user in the `admin_users` table.
 *
 * Usage:
 *   npx tsx scripts/bootstrap-admin.ts <user-email>
 * Example:
 *   npx tsx scripts/bootstrap-admin.ts admin@example.com
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const fileContent = fs.readFileSync(envPath, "utf-8");
    for (const line of fileContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...values] = trimmed.split("=");
        if (key && values.length > 0) {
          const val = values.join("=").trim().replace(/^["']|["']$/g, "");
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

loadEnvLocal();

async function bootstrapAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error("Error: Please provide a user email address.");
    console.log("Usage: npx tsx scripts/bootstrap-admin.ts <user-email>");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Searching for user with email: ${email}...`);

  const { data: users, error: userError } = await supabase.auth.admin.listUsers();

  if (userError) {
    console.error("Error fetching users from Supabase Auth:", userError.message);
    process.exit(1);
  }

  const targetUser = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!targetUser) {
    console.error(`User with email "${email}" not found in Supabase Auth.`);
    console.log("Please create the user first in Supabase Auth or via /admin/login sign-up flow.");
    process.exit(1);
  }

  console.log(`Found auth user ID: ${targetUser.id}`);

  // Check if user is already an admin
  const { data: existingAdmin, error: checkError } = await supabase
    .from("admin_users")
    .select("*")
    .eq("auth_user_id", targetUser.id)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking admin_users table:", checkError.message);
    process.exit(1);
  }

  if (existingAdmin) {
    console.log(`Success: User "${email}" (${targetUser.id}) is already registered as an admin.`);
    process.exit(0);
  }

  // Insert into admin_users
  const { error: insertError } = await supabase
    .from("admin_users")
    .insert({ auth_user_id: targetUser.id });

  if (insertError) {
    console.error("Failed to insert into admin_users:", insertError.message);
    process.exit(1);
  }

  console.log(`🎉 Success! User "${email}" (${targetUser.id}) has been added to admin_users.`);
}

bootstrapAdmin().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
