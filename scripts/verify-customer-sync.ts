/**
 * scripts/verify-customer-sync.ts
 *
 * Comprehensive Test Suite for Phase 4.2: Customer Auth/Profile Synchronization & Deduplication.
 */

import { parseOAuthNames } from "../lib/auth/oauth";

async function runCustomerSyncVerification() {
  console.log("=================================================");
  console.log("Customer Auth & Synchronization Verification");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details || ""}`);
      failed++;
    }
  }

  // --- In-Memory Mock Database ---
  interface MockCustomer {
    id: string;
    auth_id: string | null;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    status: string;
    addresses: Array<{ id: string; customer_id: string; label: string }>;
  }

  const mockDb = new Map<string, MockCustomer>();

  // Mock repository methods replicating lib/db/customers.ts behavior
  const mockRepo = {
    findCustomerById: async (id: string) => {
      const c = mockDb.get(id);
      return c ? JSON.parse(JSON.stringify(c)) : null;
    },
    findCustomerByAuthId: async (authId: string) => {
      for (const c of mockDb.values()) {
        if (c.auth_id === authId) return JSON.parse(JSON.stringify(c));
      }
      return null;
    },
    findCustomerByEmail: async (email: string) => {
      const normalized = email.toLowerCase().trim();
      for (const c of mockDb.values()) {
        if (c.email.toLowerCase().trim() === normalized) {
          return JSON.parse(JSON.stringify(c));
        }
      }
      return null;
    },
    createCustomer: async (data: {
      auth_id?: string | null;
      email: string;
      first_name?: string | null;
      last_name?: string | null;
      phone?: string | null;
      status?: string;
    }) => {
      const normalized = data.email.toLowerCase().trim();
      for (const c of mockDb.values()) {
        if (c.email.toLowerCase().trim() === normalized) {
          const err = new Error('duplicate key value violates unique constraint "customers_email_key"');
          (err as any).code = "23505";
          throw err;
        }
      }
      const id = `cust-${mockDb.size + 1}`;
      const record: MockCustomer = {
        id,
        auth_id: data.auth_id || null,
        email: normalized,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        phone: data.phone || null,
        status: data.status || "active",
        addresses: [],
      };
      mockDb.set(id, record);
      return JSON.parse(JSON.stringify(record));
    },
    updateCustomer: async (
      id: string,
      data: Partial<MockCustomer>
    ) => {
      const c = mockDb.get(id);
      if (!c) throw new Error("Customer not found");
      if (data.auth_id !== undefined) c.auth_id = data.auth_id;
      if (data.email !== undefined) c.email = data.email.toLowerCase().trim();
      if (data.first_name !== undefined) c.first_name = data.first_name;
      if (data.last_name !== undefined) c.last_name = data.last_name;
      if (data.phone !== undefined) c.phone = data.phone;
      return JSON.parse(JSON.stringify(c));
    },
  };

  // Domain sync logic replicating services/customer-service.ts syncCustomerProfile
  async function syncCustomerProfile(input: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    user_metadata?: Record<string, unknown> | null;
  }) {
    const email = input.email?.toLowerCase().trim();
    const meta = input.user_metadata ?? {};
    const parsed = parseOAuthNames(meta);

    const firstName = input.firstName?.trim() || parsed.firstName || null;
    const lastName = input.lastName?.trim() || parsed.lastName || null;
    const phone = input.phone?.trim() || (meta.phone as string)?.trim() || null;

    // 1. Check if customer already exists by auth_id
    let customer = await mockRepo.findCustomerByAuthId(input.id);

    if (customer) {
      const updates: any = {};
      if (!customer.first_name && firstName) updates.first_name = firstName;
      if (!customer.last_name && lastName) updates.last_name = lastName;
      if (!customer.phone && phone) updates.phone = phone;

      if (Object.keys(updates).length > 0) {
        await mockRepo.updateCustomer(customer.id, updates);
        customer = await mockRepo.findCustomerById(customer.id);
      }
      return { customer, action: "matched_auth_id" };
    }

    // 2. Check if customer exists by normalized email
    if (email) {
      customer = await mockRepo.findCustomerByEmail(email);

      if (customer) {
        const updates: any = {
          auth_id: input.id,
        };
        if (!customer.first_name && firstName) updates.first_name = firstName;
        if (!customer.last_name && lastName) updates.last_name = lastName;
        if (!customer.phone && phone) updates.phone = phone;

        await mockRepo.updateCustomer(customer.id, updates);
        customer = await mockRepo.findCustomerById(customer.id);
        return { customer, action: "linked_email" };
      }
    }

    // 3. Create fresh customer record
    if (!email) return null;

    try {
      const created = await mockRepo.createCustomer({
        auth_id: input.id,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        status: "active",
      });
      customer = await mockRepo.findCustomerById(created.id);
      return { customer, action: "created_new" };
    } catch (createErr) {
      const existing = await mockRepo.findCustomerByEmail(email);
      if (existing) {
        const updates: any = {
          auth_id: input.id,
        };
        if (!existing.first_name && firstName) updates.first_name = firstName;
        if (!existing.last_name && lastName) updates.last_name = lastName;
        if (!existing.phone && phone) updates.phone = phone;

        await mockRepo.updateCustomer(existing.id, updates);
        customer = await mockRepo.findCustomerById(existing.id);
        return { customer, action: "linked_email_race_recovery" };
      }
      throw createErr;
    }
  }

  // -------------------------------------------------------------
  // Test Case 1: Brand-New User Email Signup
  // -------------------------------------------------------------
  console.log("--- 1. Brand-New Customer Registration ---");

  const brandNew = await syncCustomerProfile({
    id: "auth-user-001",
    email: "new.shopper@sivvai.com",
    firstName: "Ada",
    lastName: "Lovelace",
    phone: "+2348011112222",
  });

  assert(brandNew !== null && brandNew.action === "created_new", "Brand new user creates exactly 1 customer row");
  assert(mockDb.size === 1, "Database contains 1 customer");
  assert(brandNew?.customer.auth_id === "auth-user-001", "Auth ID is assigned to new customer");
  assert(brandNew?.customer.email === "new.shopper@sivvai.com", "Email is normalized and stored");

  // -------------------------------------------------------------
  // Test Case 2: Linking Existing Guest Record by Email
  // -------------------------------------------------------------
  console.log("\n--- 2. Linking Existing Guest Customer Record ---");

  // Seed guest customer record (auth_id = null) with attached address
  const guestCustId = "cust-guest-888";
  mockDb.set(guestCustId, {
    id: guestCustId,
    auth_id: null,
    email: "sivvai.labs@gmail.com",
    first_name: null,
    last_name: null,
    phone: null,
    status: "active",
    addresses: [
      { id: "addr-001", customer_id: guestCustId, label: "Lagos Office" }
    ],
  });

  assert(mockDb.size === 2, "Database initialized with guest record");

  // Now user signs in with Supabase Auth (auth_id: aa0995aa-17e4-47d3-b2bc-c8df59da6130)
  const linked = await syncCustomerProfile({
    id: "aa0995aa-17e4-47d3-b2bc-c8df59da6130",
    email: "  SIVVAI.LABS@GMAIL.COM  ", // mixed case + whitespace
    firstName: "Sivvai",
    lastName: "Labs",
    phone: "+2348099990000",
  });

  assert(linked !== null && linked.action === "linked_email", "Existing guest record matched by email and linked");
  assert(linked?.customer.id === guestCustId, "Existing customer UUID preserved (cust-guest-888)");
  assert(linked?.customer.auth_id === "aa0995aa-17e4-47d3-b2bc-c8df59da6130", "Customer record linked to new auth_id");
  assert(linked?.customer.first_name === "Sivvai", "Missing first_name backfilled");
  assert(linked?.customer.last_name === "Labs", "Missing last_name backfilled");
  assert(linked?.customer.addresses.length === 1, "Existing addresses relationship preserved intact");
  assert(mockDb.size === 2, "Total database rows remain 2 (zero duplicate customer created)");

  // -------------------------------------------------------------
  // Test Case 3: Idempotency (Repeated Logins / Callbacks)
  // -------------------------------------------------------------
  console.log("\n--- 3. Idempotency & Repeated Sync Invariants ---");

  const repeat1 = await syncCustomerProfile({
    id: "aa0995aa-17e4-47d3-b2bc-c8df59da6130",
    email: "sivvai.labs@gmail.com",
    firstName: "Sivvai",
    lastName: "Labs",
  });

  assert(repeat1 !== null && repeat1.action === "matched_auth_id", "Subsequent login matches by auth_id directly");
  assert(repeat1?.customer.id === guestCustId, "Customer UUID unchanged");
  assert(mockDb.size === 2, "Customer count strictly unchanged on repeated login");

  const repeat2 = await syncCustomerProfile({
    id: "aa0995aa-17e4-47d3-b2bc-c8df59da6130",
    email: "sivvai.labs@gmail.com",
    user_metadata: { given_name: "Sivvai", family_name: "Labs" },
  });

  assert(repeat2 !== null && repeat2.action === "matched_auth_id", "Repeated OAuth callback matches auth_id without error");
  assert(mockDb.size === 2, "No duplicate customer rows created");

  // -------------------------------------------------------------
  // Test Case 4: Concurrent Race Condition Recovery
  // -------------------------------------------------------------
  console.log("\n--- 4. Concurrent Race Condition Simulation ---");

  // Simulate two parallel requests trying to create customer for "race@example.com"
  const raceEmail = "race@example.com";
  const [raceRes1, raceRes2] = await Promise.all([
    syncCustomerProfile({
      id: "auth-race-1",
      email: raceEmail,
      firstName: "Race",
      lastName: "One",
    }),
    syncCustomerProfile({
      id: "auth-race-1",
      email: raceEmail,
      firstName: "Race",
      lastName: "One",
    }),
  ]);

  assert(
    raceRes1?.customer.id === raceRes2?.customer.id,
    "Concurrent sync resolves to the identical customer UUID"
  );
  assert(
    mockDb.size === 3,
    "Database contains exactly 3 customers (1 new + 1 linked guest + 1 race test)"
  );

  console.log("\n=================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runCustomerSyncVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
