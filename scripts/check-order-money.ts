import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(process.cwd(), '.env.local');
const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
for (const l of lines) {
  const t = l.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0) {
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function main() {
  const { data: order } = await sb
    .from('orders')
    .select('*, order_lines(*)')
    .or('order_number.eq.ORD-20260827-68570,id.eq.05d82c77-2994-43b4-9ce0-e1b309d07500')
    .single();

  console.log('\n=== EXACT STORED ORDER DATA ===');
  console.log('Order Number:    ', order?.order_number);
  console.log('Order ID:        ', order?.id);
  console.log('Currency:        ', order?.currency);
  console.log('subtotal:        ', order?.subtotal);
  console.log('shipping_total:  ', order?.shipping_total);
  console.log('discount_total:  ', order?.discount_total);
  console.log('tax_total:       ', order?.tax_total);
  console.log('grand_total:     ', order?.grand_total);
  console.log('\nOrder Lines:');
  for (const line of (order?.order_lines || [])) {
    console.log('  Line: ' + line.product_name_snapshot + ' | qty: ' + line.quantity + ' | unit_price_snapshot: ' + line.unit_price_snapshot + ' | line_total: ' + line.line_total);
  }
}
main().catch(console.error);
