/**
 * scripts/apply-developer-migration.ts
 *
 * Seeds Developer role and view_products / view_inventory permissions,
 * and sets up role_permissions mappings in the database.
 */

import "./preload-server-only";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const l of lines) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0) {
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("Applying Developer role and view permissions to Supabase...");

  // 1. Insert role: developer
  const { data: devRole, error: devRoleErr } = await sb
    .from("roles")
    .upsert(
      {
        key: "developer",
        name: "Developer",
        description: "Full access to all features except administrator user management",
      },
      { onConflict: "key" }
    )
    .select()
    .single();

  if (devRoleErr) {
    console.error("Failed to upsert developer role:", devRoleErr.message);
  } else {
    console.log("✅ Developer role upserted:", devRole.id);
  }

  // 2. Insert permissions: view_products, view_inventory
  const { error: permErr } = await sb.from("permissions").upsert(
    [
      { key: "view_products", description: "View products and catalog details (read-only)" },
      { key: "view_inventory", description: "View inventory levels and stock movements (read-only)" },
    ],
    { onConflict: "key" }
  );

  if (permErr) {
    console.error("Failed to upsert view permissions:", permErr.message);
  } else {
    console.log("✅ view_products and view_inventory permissions upserted");
  }

  // 3. Fetch all roles and permissions
  const [{ data: allRoles }, { data: allPerms }] = await Promise.all([
    sb.from("roles").select("id, key"),
    sb.from("permissions").select("id, key"),
  ]);

  const rolesMap = new Map((allRoles || []).map((r) => [r.key, r.id]));
  const permsMap = new Map((allPerms || []).map((p) => [p.key, p.id]));

  const ownerId = rolesMap.get("owner")!;
  const managerId = rolesMap.get("manager")!;
  const editorId = rolesMap.get("editor")!;
  const supportId = rolesMap.get("support")!;
  const developerId = rolesMap.get("developer")!;

  const viewProductsId = permsMap.get("view_products")!;
  const viewInventoryId = permsMap.get("view_inventory")!;

  const newMappings: Array<{ role_id: string; permission_id: string }> = [];

  // Owner gets view_products, view_inventory
  if (ownerId) {
    if (viewProductsId) newMappings.push({ role_id: ownerId, permission_id: viewProductsId });
    if (viewInventoryId) newMappings.push({ role_id: ownerId, permission_id: viewInventoryId });
  }

  // Manager gets view_products, view_inventory
  if (managerId) {
    if (viewProductsId) newMappings.push({ role_id: managerId, permission_id: viewProductsId });
    if (viewInventoryId) newMappings.push({ role_id: managerId, permission_id: viewInventoryId });
  }

  // Editor gets view_products
  if (editorId && viewProductsId) {
    newMappings.push({ role_id: editorId, permission_id: viewProductsId });
  }

  // Support gets view_products, view_inventory
  if (supportId) {
    if (viewProductsId) newMappings.push({ role_id: supportId, permission_id: viewProductsId });
    if (viewInventoryId) newMappings.push({ role_id: supportId, permission_id: viewInventoryId });
  }

  // Developer gets all permissions EXCEPT manage_users
  if (developerId) {
    for (const [permKey, permId] of permsMap.entries()) {
      if (permKey !== "manage_users") {
        newMappings.push({ role_id: developerId, permission_id: permId });
      }
    }
  }

  for (const mapping of newMappings) {
    await sb
      .from("role_permissions")
      .upsert(mapping, { onConflict: "role_id,permission_id" as any });
  }

  console.log(`✅ Upserted ${newMappings.length} role_permission records.`);
  console.log("Migration script completed successfully!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
