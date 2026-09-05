import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: testCats } = await supabase
    .from("categories")
    .select("id")
    .or("slug.eq.verify-p3p4-cat,slug.eq.verify-p7p8-cat,slug.like.p2-test-cat-%");

  const catIds = testCats?.map(c => c.id) || [];
  const { data: testProds } = await supabase.from("products").select("id").in("category_id", catIds);
  const prodIds = testProds?.map(p => p.id) || [];
  const { data: variants } = await supabase.from("product_variants").select("id").in("product_id", prodIds);
  const varIds = variants?.map(v => v.id) || [];

  const { data: orderLines, error: olErr } = await supabase
    .from("order_lines")
    .select("*")
    .in("variant_id", varIds);

  if (olErr) console.error("olErr:", olErr);
  console.log("Order lines linked to test variants:", orderLines);

  const orderIds = orderLines?.map(ol => ol.order_id) || [];
  if (orderIds.length > 0) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, customer_email, total_amount, created_at")
      .in("id", orderIds);
    console.log("Orders linked to test variants:", orders);
  }
}

main().catch(console.error);
