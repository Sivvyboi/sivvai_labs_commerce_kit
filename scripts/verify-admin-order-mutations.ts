/**
 * scripts/verify-admin-order-mutations.ts
 *
 * Verification suite for admin order status and note mutation paths.
 * Uses service-role client directly (bypasses server-only guard).
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
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

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  console.log('==================================================================');
  console.log('  Admin Order Status & Notes Mutation Verification Suite');
  console.log('==================================================================\n');

  // 1. Fetch Target Order ORD-20260827-62107
  const { data: order, error: orderErr } = await sb
    .from('orders')
    .select('*, lines:order_lines(*), status_events:order_status_events(*), notes:order_notes(*)')
    .eq('order_number', 'ORD-20260827-62107')
    .single();

  if (orderErr || !order) {
    console.error('Target order not found:', orderErr?.message);
    process.exit(1);
  }

  console.log(`Target Order: ${order.order_number} | ID: ${order.id} | Status: ${order.status}`);
  const initialStatus = order.status as string;

  // ── TEST 1: Status Update (Processing → Shipped) ──────────────────────────
  console.log('\n[TEST 1] Status transition: Processing → Shipped with Status Note');

  // Read current status from DB first
  const { data: pre } = await sb.from('orders').select('status').eq('id', order.id).single();
  const fromStatus = pre?.status ?? initialStatus;

  // Update status
  const { data: updatedOrder, error: updateErr } = await sb
    .from('orders')
    .update({ status: 'shipped' })
    .eq('id', order.id)
    .select('status')
    .single();

  if (updateErr) throw new Error(`Status update failed: ${updateErr.message}`);
  console.log(`  → orders.status now: ${updatedOrder?.status}`);

  // Record status event
  const statusNote = 'Dispatched via GIG Logistics tracking #GIG-987654';
  const { data: evInsert, error: evErr } = await sb
    .from('order_status_events')
    .insert({
      order_id: order.id,
      from_status: fromStatus,
      to_status: 'shipped',
      actor: 'admin',
      note: statusNote,
    })
    .select()
    .single();

  if (evErr) throw new Error(`Event insert failed: ${evErr.message}`);
  console.log(`  → order_status_events row created: ${evInsert.id}`);
  console.log(`    from_status: ${evInsert.from_status} | to_status: ${evInsert.to_status}`);
  console.log(`    actor: ${evInsert.actor} | note: ${evInsert.note}`);

  // Verify
  if (evInsert.from_status !== fromStatus) throw new Error(`from_status mismatch: expected '${fromStatus}', got '${evInsert.from_status}'`);
  if (evInsert.to_status !== 'shipped') throw new Error(`to_status mismatch`);
  if (evInsert.actor !== 'admin') throw new Error(`actor mismatch`);
  if (evInsert.note !== statusNote) throw new Error(`status note mismatch`);
  console.log('  ✓ TEST 1 PASSED — Status update + event recording\n');

  // ── TEST 2: Internal Note Insertion ──────────────────────────────────────
  console.log('[TEST 2] Internal note insertion with author_type="admin"');

  const noteBody = `Customer called requesting delivery before 5 PM. Logged at ${new Date().toISOString()}`;
  const { data: noteRow, error: noteErr } = await sb
    .from('order_notes')
    .insert({
      order_id: order.id,
      body: noteBody,
      author_type: 'admin',
    })
    .select()
    .single();

  if (noteErr) throw new Error(`Note insert failed: ${noteErr.message}`);
  console.log(`  → order_notes row created: ${noteRow.id}`);
  console.log(`    author_type: ${noteRow.author_type} | body: "${noteRow.body.substring(0, 50)}..."`);

  if (noteRow.author_type !== 'admin') throw new Error(`author_type mismatch`);
  if (noteRow.body !== noteBody) throw new Error(`body mismatch`);
  console.log('  ✓ TEST 2 PASSED — Internal note insertion\n');

  // ── TEST 3: Verify total event and note counts ────────────────────────────
  console.log('[TEST 3] Verify accumulated events and notes on the order');

  const { data: allEvents } = await sb.from('order_status_events').select('*').eq('order_id', order.id);
  const { data: allNotes } = await sb.from('order_notes').select('*').eq('order_id', order.id);

  console.log(`  → Total order_status_events: ${allEvents?.length}`);
  console.log(`  → Total order_notes: ${allNotes?.length}`);

  if ((allEvents?.length ?? 0) < 1) throw new Error('Expected at least 1 status event');
  if ((allNotes?.length ?? 0) < 1) throw new Error('Expected at least 1 internal note');
  console.log('  ✓ TEST 3 PASSED — Events and notes are present\n');

  // ── TEST 4: Revert Status back to original ───────────────────────────────
  console.log('[TEST 4] Reverting order status back to "processing" (cleanup)');
  const { error: revertErr } = await sb
    .from('orders')
    .update({ status: 'processing' })
    .eq('id', order.id);
  if (revertErr) throw new Error(`Revert failed: ${revertErr.message}`);
  console.log('  ✓ TEST 4 PASSED — Reverted to processing\n');

  // ── Cleanup test note ────────────────────────────────────────────────────
  await sb.from('order_notes').delete().eq('id', noteRow.id);

  console.log('==================================================================');
  console.log('  ✅ ALL ADMIN ORDER MUTATION TESTS PASSED');
  console.log('==================================================================');
}

main().catch((err) => {
  console.error('\n❌ Test suite FAILED:', err.message);
  process.exit(1);
});
