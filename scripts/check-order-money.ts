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

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function main() {
  const { data: orders } = await sb.from('orders').select('order_number,subtotal,shipping_total,grand_total,created_at').order('created_at', { ascending: false }).limit(5);
  console.log('\nRecent Orders (money_amount = kobo):');
  for (const o of (orders || [])) {
    const sub = Number(o.subtotal);
    const ship = Number(o.shipping_total);
    const grand = Number(o.grand_total);
    console.log('  ' + o.order_number + ': subtotal=' + sub + ' kobo (N' + (sub/100) + '), shipping=' + ship + ' kobo (N' + (ship/100) + '), grand=' + grand + ' kobo (N' + (grand/100) + ')');
  }
  const { data: sessions } = await sb.from('checkout_sessions').select('id,status,subtotal,shipping_total,grand_total,created_at').order('created_at', { ascending: false }).limit(3);
  console.log('\nRecent Checkout Sessions (INTEGER = naira):');
  for (const s of (sessions || [])) {
    console.log('  ' + s.id + ' [' + s.status + ']: subtotal=N' + s.subtotal + ', shipping=N' + s.shipping_total + ', grand=N' + s.grand_total);
  }
}
main().catch(console.error);
