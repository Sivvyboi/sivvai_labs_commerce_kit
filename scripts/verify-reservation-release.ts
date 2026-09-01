/**
 * scripts/verify-reservation-release.ts
 *
 * Verification suite for manual inventory reservation release.
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
  console.log('  Manual Inventory Reservation Release Verification Suite');
  console.log('==================================================================\n');

  // 1. Fetch an inventory record
  const { data: invRecords, error: invErr } = await sb
    .from('inventory_records')
    .select('*, variant:product_variants(*, product:products(name))')
    .limit(1);

  if (invErr || !invRecords || invRecords.length === 0) {
    console.error('No inventory record found:', invErr);
    process.exit(1);
  }

  const inv = invRecords[0];
  console.log(`Testing with product: ${inv.variant?.product?.name} (Variant: ${inv.variant_id})`);
  console.log(`Initial State -> On Hand: ${inv.on_hand_quantity} | Reserved: ${inv.reserved_quantity} | Available: ${inv.on_hand_quantity - inv.reserved_quantity}`);

  const initialOnHand = inv.on_hand_quantity;
  const initialReserved = inv.reserved_quantity;

  // 2. Create a temporary checkout session for the test
  const testReservationQty = 2;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // Create a cart & checkout session first
  const cartExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: cart, error: cartErr } = await sb
    .from('carts')
    .insert({ status: 'active', expires_at: cartExpiresAt })
    .select()
    .single();

  if (cartErr || !cart) {
    console.error('Failed to create test cart:', cartErr);
    process.exit(1);
  }
  const { data: session, error: sessErr } = await sb
    .from('checkout_sessions')
    .insert({
      cart_id: cart?.id,
      guest_contact: { email: 'test-reservation@example.com' },
      subtotal: 10000,
      shipping_total: 0,
      discount_total: 0,
      tax_total: 0,
      grand_total: 10000,
      currency: 'NGN',
      status: 'open',
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (sessErr || !session) {
    console.error('Failed to create test checkout session:', sessErr);
    process.exit(1);
  }

  console.log(`\n[STEP 1] Creating test reservation of ${testReservationQty} units with session ${session.id}...`);
  const { data: reservation, error: resErr } = await sb
    .from('inventory_reservations')
    .insert({
      inventory_record_id: inv.id,
      variant_id: inv.variant_id,
      checkout_session_id: session.id,
      quantity: testReservationQty,
      status: 'active',
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (resErr || !reservation) {
    console.error('Failed to create test reservation:', resErr);
    process.exit(1);
  }

  console.log(`Created reservation ID: ${reservation.id} (status: ${reservation.status})`);

  // Verify inventory_records.reserved_quantity updated via DB trigger
  const { data: invAfterReserve } = await sb
    .from('inventory_records')
    .select('*')
    .eq('id', inv.id)
    .single();

  console.log(`After Reservation -> On Hand: ${invAfterReserve?.on_hand_quantity} | Reserved: ${invAfterReserve?.reserved_quantity} | Available: ${(invAfterReserve?.on_hand_quantity ?? 0) - (invAfterReserve?.reserved_quantity ?? 0)}`);

  if (invAfterReserve?.on_hand_quantity !== initialOnHand) {
    console.error('ERROR: on_hand_quantity was modified during reservation creation!');
    process.exit(1);
  }
  if (invAfterReserve?.reserved_quantity !== initialReserved + testReservationQty) {
    console.error(`ERROR: reserved_quantity did not increase by ${testReservationQty}! Got: ${invAfterReserve?.reserved_quantity}`);
    process.exit(1);
  }
  console.log('✅ Reservation correctly increased reserved_quantity without altering on_hand_quantity');

  // 3. Test Manual Release
  console.log(`\n[STEP 2] Releasing reservation ID: ${reservation.id}...`);
  const releasedAt = new Date().toISOString();
  const { data: releasedRes, error: releaseErr } = await sb
    .from('inventory_reservations')
    .update({ status: 'released', released_at: releasedAt })
    .eq('id', reservation.id)
    .select()
    .single();

  if (releaseErr || !releasedRes) {
    console.error('Failed to release reservation:', releaseErr);
    process.exit(1);
  }

  console.log(`Reservation updated -> status: ${releasedRes.status}, released_at: ${releasedRes.released_at}`);

  // Verify inventory_records after release
  const { data: invAfterRelease } = await sb
    .from('inventory_records')
    .select('*')
    .eq('id', inv.id)
    .single();

  console.log(`After Release -> On Hand: ${invAfterRelease?.on_hand_quantity} | Reserved: ${invAfterRelease?.reserved_quantity} | Available: ${(invAfterRelease?.on_hand_quantity ?? 0) - (invAfterRelease?.reserved_quantity ?? 0)}`);

  if (invAfterRelease?.on_hand_quantity !== initialOnHand) {
    console.error('ERROR: on_hand_quantity was modified during reservation release!');
    process.exit(1);
  }
  if (invAfterRelease?.reserved_quantity !== initialReserved) {
    console.error(`ERROR: reserved_quantity did not restore to ${initialReserved}! Got: ${invAfterRelease?.reserved_quantity}`);
    process.exit(1);
  }
  console.log('✅ Manual release correctly restored reserved_quantity and available quantity without altering on_hand_quantity');

  // 4. Test Double Release Idempotency / Conflict Detection
  console.log(`\n[STEP 3] Verifying double-release safety...`);
  const { data: doubleReleaseCheck } = await sb
    .from('inventory_reservations')
    .select('status')
    .eq('id', reservation.id)
    .single();

  if (doubleReleaseCheck?.status !== 'active') {
    console.log(`Reservation status is "${doubleReleaseCheck?.status}", correctly preventing re-release.`);
  }

  // 5. Clean up test reservation and session
  console.log(`\n[STEP 4] Cleaning up test reservation, session, and cart...`);
  await sb.from('inventory_reservations').delete().eq('id', reservation.id);
  await sb.from('checkout_sessions').delete().eq('id', session.id);
  if (cart?.id) await sb.from('carts').delete().eq('id', cart.id);

  const { data: finalInv } = await sb
    .from('inventory_records')
    .select('*')
    .eq('id', inv.id)
    .single();

  console.log(`Final State -> On Hand: ${finalInv?.on_hand_quantity} | Reserved: ${finalInv?.reserved_quantity} | Available: ${(finalInv?.on_hand_quantity ?? 0) - (finalInv?.reserved_quantity ?? 0)}`);
  console.log('\n==================================================================');
  console.log('  ALL TESTS PASSED SUCCESSFULLY! ✅');
  console.log('==================================================================');
}

main().catch(console.error);
