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
  console.log('=== Testing Order Mutation Database Constraints ===\n');

  console.log('1. Testing statuses on orders table:');
  const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'];
  for (const st of statuses) {
    const { data: o, error: e } = await sb.from('orders').insert({
      order_number: 'TEST-' + st + '-' + Date.now(),
      status: st,
      subtotal: 100,
      shipping_total: 0,
      discount_total: 0,
      tax_total: 0,
      grand_total: 100,
      currency: 'NGN'
    }).select().single();
    if (e) {
      console.log('  Status "' + st + '" -> FAILED: ' + e.message);
    } else {
      console.log('  Status "' + st + '" -> OK');
      await sb.from('orders').delete().eq('id', o.id);
    }
  }

  console.log('\n2. Testing author_types on order_notes table:');
  const authorTypes = ['buyer', 'merchant', 'system', 'admin', 'customer'];
  for (const at of authorTypes) {
    const { data: n, error: e } = await sb.from('order_notes').insert({
      order_id: '382ea6aa-68e0-4d51-b899-c6ae7310f9e1',
      body: 'test ' + at,
      author_type: at
    }).select().single();
    if (e) {
      console.log('  author_type "' + at + '" -> FAILED: ' + e.message);
    } else {
      console.log('  author_type "' + at + '" -> OK');
      await sb.from('order_notes').delete().eq('id', n.id);
    }
  }

  console.log('\n3. Testing actors on order_status_events table:');
  const actors = ['admin', 'system', 'customer', 'merchant', 'buyer'];
  for (const act of actors) {
    const { data: ev, error: e } = await sb.from('order_status_events').insert({
      order_id: '382ea6aa-68e0-4d51-b899-c6ae7310f9e1',
      from_status: 'processing',
      to_status: 'processing',
      actor: act,
      note: 'test ' + act
    }).select().single();
    if (e) {
      console.log('  actor "' + act + '" -> FAILED: ' + e.message);
    } else {
      console.log('  actor "' + act + '" -> OK');
      await sb.from('order_status_events').delete().eq('id', ev.id);
    }
  }
}

main().catch(console.error);
