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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, archived_at, created_at")
    .order("created_at", { ascending: true });

  let out = "=== ALL CATEGORIES ===\n";
  for (const cat of categories || []) {
    out += `[CAT] ${cat.id} | slug: ${cat.slug} | name: "${cat.name}" | archived: ${cat.archived_at}\n`;
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, status, category_id, archived_at, created_at")
    .order("created_at", { ascending: true });

  out += "\n=== ALL PRODUCTS ===\n";
  for (const prod of products || []) {
    out += `[PROD] ${prod.id} | slug: ${prod.slug} | status: ${prod.status} | cat: ${prod.category_id} | name: "${prod.name}"\n`;
  }

  fs.writeFileSync(path.resolve(process.cwd(), "scratch/audit-out.txt"), out, "utf-8");
  console.log("Wrote audit output to scratch/audit-out.txt");
}

main().catch(console.error);
