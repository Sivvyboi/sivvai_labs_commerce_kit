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

const targetCategorySlugs = [
  "verify-p3p4-cat",
  "verify-p7p8-cat",
];

async function main() {
  const { data: testCats } = await supabase
    .from("categories")
    .select("id, slug, name")
    .or("slug.eq.verify-p3p4-cat,slug.eq.verify-p7p8-cat,slug.like.p2-test-cat-%");

  console.log("Matched test categories:", testCats?.map(c => ({ id: c.id, slug: c.slug })));

  const catIds = testCats?.map(c => c.id) || [];
  if (catIds.length === 0) {
    console.log("No categories found");
    return;
  }

  const { data: testProds } = await supabase
    .from("products")
    .select("id, slug, category_id")
    .in("category_id", catIds);

  console.log(`Matched test products: ${testProds?.length}`);
  const prodIds = testProds?.map(p => p.id) || [];

  if (prodIds.length === 0) {
    console.log("No test products to check");
    return;
  }

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, product_id")
    .in("product_id", prodIds);

  const varIds = variants?.map(v => v.id) || [];
  console.log(`Matched test variants: ${varIds.length}`);

  if (varIds.length > 0) {
    const { count: orderLinesCount } = await supabase
      .from("order_lines")
      .select("*", { count: "exact", head: true })
      .in("variant_id", varIds);
    console.log(`Referencing order_lines: ${orderLinesCount}`);

    const { count: cartLinesCount } = await supabase
      .from("cart_lines")
      .select("*", { count: "exact", head: true })
      .in("variant_id", varIds);
    console.log(`Referencing cart_lines: ${cartLinesCount}`);

    const { count: reservationsCount } = await supabase
      .from("inventory_reservations")
      .select("*", { count: "exact", head: true })
      .in("variant_id", varIds);
    console.log(`Referencing inventory_reservations: ${reservationsCount}`);

    const { data: invRecords } = await supabase
      .from("inventory_records")
      .select("id")
      .in("variant_id", varIds);

    const invIds = invRecords?.map(i => i.id) || [];
    console.log(`Referencing inventory_records: ${invIds.length}`);

    if (invIds.length > 0) {
      const { count: stockMovementsCount } = await supabase
        .from("stock_movements")
        .select("*", { count: "exact", head: true })
        .in("inventory_record_id", invIds);
      console.log(`Referencing stock_movements: ${stockMovementsCount}`);
    }
  }
}

main().catch(console.error);
