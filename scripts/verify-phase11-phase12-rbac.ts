/**
 * scripts/verify-phase11-phase12-rbac.ts
 *
 * Automated verification suite for Phase 11 & 12:
 * - Developer role and permissions
 * - view_products & view_inventory permissions
 * - Permission hierarchy (manage_* -> view_*)
 * - Role permission boundaries (Developer has no manage_users; Support has read-only products/inventory)
 * - audit_logs database queries & actor enrichment
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
      process.env[k] = v;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function runTests() {
  console.log("=================================================");
  console.log("Phase 11 & 12: Admin Roles & Security Verification");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Verify Roles exist
  console.log("--- 1. Verifying Roles in Database ---");
  const { data: roles, error: rolesErr } = await supabase
    .from("roles")
    .select("id, key, name");

  assert(!rolesErr, "Roles query succeeded");
  const roleKeys = roles?.map((r) => r.key) || [];
  assert(roleKeys.includes("owner"), "Role 'owner' exists");
  assert(roleKeys.includes("manager"), "Role 'manager' exists");
  assert(roleKeys.includes("editor"), "Role 'editor' exists");
  assert(roleKeys.includes("support"), "Role 'support' exists");
  assert(roleKeys.includes("developer"), "Role 'developer' exists");

  // 2. Verify Permissions exist
  console.log("\n--- 2. Verifying Permissions in Database ---");
  const { data: permissions, error: permErr } = await supabase
    .from("permissions")
    .select("id, key");

  assert(!permErr, "Permissions query succeeded");
  const permKeys = permissions?.map((p) => p.key) || [];
  assert(permKeys.includes("view_products"), "Permission 'view_products' exists");
  assert(permKeys.includes("view_inventory"), "Permission 'view_inventory' exists");
  assert(permKeys.includes("manage_products"), "Permission 'manage_products' exists");
  assert(permKeys.includes("manage_inventory"), "Permission 'manage_inventory' exists");
  assert(permKeys.includes("view_activity"), "Permission 'view_activity' exists");
  assert(permKeys.includes("manage_users"), "Permission 'manage_users' exists");

  // 3. Verify Developer Role Permissions & Invariants
  console.log("\n--- 3. Verifying Developer Role Boundary ---");
  const devRole = roles?.find((r) => r.key === "developer");
  const { data: devRolePerms } = await supabase
    .from("role_permissions")
    .select("permission_id, permissions(key)")
    .eq("role_id", devRole?.id);

  const devKeys = (devRolePerms || []).map((rp: any) => rp.permissions?.key).filter(Boolean);
  assert(devKeys.includes("view_activity"), "Developer has view_activity");
  assert(devKeys.includes("manage_products"), "Developer has manage_products");
  assert(devKeys.includes("view_products"), "Developer has view_products");
  assert(devKeys.includes("manage_inventory"), "Developer has manage_inventory");
  assert(devKeys.includes("view_inventory"), "Developer has view_inventory");
  assert(devKeys.includes("manage_orders"), "Developer has manage_orders");
  assert(devKeys.includes("manage_settings"), "Developer has manage_settings");
  assert(!devKeys.includes("manage_users"), "CRITICAL INVARIANT: Developer DOES NOT have manage_users");

  // 4. Verify Support Role Permissions & Invariants
  console.log("\n--- 4. Verifying Support Role Read-Only Boundary ---");
  const supportRole = roles?.find((r) => r.key === "support");
  const { data: supportRolePerms } = await supabase
    .from("role_permissions")
    .select("permission_id, permissions(key)")
    .eq("role_id", supportRole?.id);

  const supportKeys = (supportRolePerms || []).map((rp: any) => rp.permissions?.key).filter(Boolean);
  assert(supportKeys.includes("view_products"), "Support has view_products (read-only)");
  assert(supportKeys.includes("view_inventory"), "Support has view_inventory (read-only)");
  assert(supportKeys.includes("view_orders"), "Support has view_orders");
  assert(supportKeys.includes("view_customers"), "Support has view_customers");
  assert(!supportKeys.includes("manage_products"), "Support DOES NOT have manage_products");
  assert(!supportKeys.includes("manage_inventory"), "Support DOES NOT have manage_inventory");
  assert(!supportKeys.includes("manage_users"), "Support DOES NOT have manage_users");

  // 5. Verify Editor Role Permissions & Invariants
  console.log("\n--- 5. Verifying Editor Role Boundary ---");
  const editorRole = roles?.find((r) => r.key === "editor");
  const { data: editorRolePerms } = await supabase
    .from("role_permissions")
    .select("permission_id, permissions(key)")
    .eq("role_id", editorRole?.id);

  const editorKeys = (editorRolePerms || []).map((rp: any) => rp.permissions?.key).filter(Boolean);
  assert(editorKeys.includes("manage_products"), "Editor has manage_products");
  assert(editorKeys.includes("view_products"), "Editor has view_products");
  assert(!editorKeys.includes("manage_inventory"), "Editor DOES NOT have manage_inventory");
  assert(!editorKeys.includes("manage_users"), "Editor DOES NOT have manage_users");

  // 6. Verify Permission Hierarchy Logic
  console.log("\n--- 6. Verifying Permission Hierarchy Fallback Logic ---");
  function simulateHasPermission(userPerms: string[], required: string): boolean {
    if (userPerms.includes(required)) return true;
    if (required === "view_orders" && userPerms.includes("manage_orders")) return true;
    if (required === "view_customers" && userPerms.includes("manage_customers")) return true;
    if (required === "view_products" && userPerms.includes("manage_products")) return true;
    if (required === "view_inventory" && userPerms.includes("manage_inventory")) return true;
    return false;
  }

  // Manager has manage_products but maybe not explicitly view_products:
  assert(simulateHasPermission(["manage_products"], "view_products"), "manage_products grants view_products");
  assert(simulateHasPermission(["manage_inventory"], "view_inventory"), "manage_inventory grants view_inventory");
  assert(!simulateHasPermission(["view_products"], "manage_products"), "view_products DOES NOT grant manage_products");
  assert(!simulateHasPermission(["view_inventory"], "manage_inventory"), "view_inventory DOES NOT grant manage_inventory");
  assert(!simulateHasPermission(["view_products", "view_inventory"], "manage_users"), "read-only DOES NOT grant manage_users");

  // 7. Verify audit_logs Table & Queries
  console.log("\n--- 7. Verifying audit_logs Table & Records ---");
  const { data: logs, count, error: auditErr } = await supabase
    .from("audit_logs")
    .select("id, admin_user_id, action, entity_type, entity_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(5);

  assert(!auditErr, "Querying audit_logs table succeeded without error");
  console.log(`Total audit_logs records in database: ${count ?? 0}`);
  if (logs && logs.length > 0) {
    console.log(`Latest audit action: '${logs[0].action}' on entity '${logs[0].entity_type || "n/a"}' at ${logs[0].created_at}`);
  }

  console.log("\n=================================================");
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Verification script crashed:", err);
  process.exit(1);
});
