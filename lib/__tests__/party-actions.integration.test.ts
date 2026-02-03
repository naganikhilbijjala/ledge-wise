/**
 * Integration tests for party server actions.
 * Tests CRUD operations and balance adjustments against real database.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  createTestUser,
  createTestAccount,
  createTestParty,
  getPartyBalance,
  cleanupTestUser,
  disconnectPrisma,
  prisma,
} from "./test-helpers";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth-utils", () => ({
  requireAuth: vi.fn(),
}));

import {
  createParty,
  getPartyById,
  updateParty,
  deleteParty,
  getPartiesForUser,
  adjustPartyBalance,
} from "@/lib/party-actions";
import { createTransaction } from "@/lib/transaction-actions";
import { requireAuth } from "@/lib/auth-utils";

const mockedRequireAuth = vi.mocked(requireAuth);

let testUserId: string;

beforeAll(async () => {
  const user = await createTestUser();
  testUserId = user.id;
  mockedRequireAuth.mockResolvedValue(testUserId);
});

afterAll(async () => {
  await cleanupTestUser(testUserId);
  await disconnectPrisma();
});

// ─── Create Party ──────────────────────────────────────────────────

describe("createParty", () => {
  it("creates a CUSTOMER party", async () => {
    const party = await createParty({ name: "Raju Farmer", type: "CUSTOMER" });

    expect(party).toBeDefined();
    expect(party.name).toBe("Raju Farmer");
    expect(party.type).toBe("CUSTOMER");
  });

  it("creates a VENDOR party", async () => {
    const party = await createParty({ name: "Srinivas Traders", type: "VENDOR" });
    expect(party.type).toBe("VENDOR");
  });

  it("creates party with contact details", async () => {
    const party = await createParty({
      name: "Contact Party",
      type: "CUSTOMER",
      phone: "9876543210",
      address: "Hyderabad, Telangana",
    });

    expect(party.phone).toBe("9876543210");
    expect(party.address).toBe("Hyderabad, Telangana");
  });

  it("creates party with state for GST", async () => {
    const party = await createParty({
      name: "GST Party",
      type: "VENDOR",
      state: "Maharashtra",
      gstNumber: "27AABCU9603R1ZN",
    });

    expect(party.state).toBe("Maharashtra");
    expect(party.gstNumber).toBe("27AABCU9603R1ZN");
  });

  it("creates party with notes", async () => {
    const party = await createParty({
      name: "Notes Party",
      type: "CUSTOMER",
      notes: "Reliable supplier from Nizamabad",
    });

    expect(party.notes).toBe("Reliable supplier from Nizamabad");
  });
});

// ─── Get Party ─────────────────────────────────────────────────────

describe("getPartyById", () => {
  it("returns party with correct fields", async () => {
    const created = await createTestParty(testUserId, {
      name: "GetById-Party",
      type: "VENDOR",
      state: "Telangana",
    });

    const party = await getPartyById(created.id);

    expect(party).not.toBeNull();
    expect(party!.name).toBe("GetById-Party");
    expect(party!.type).toBe("VENDOR");
    expect(party!.state).toBe("Telangana");
  });

  it("returns null for non-existent party", async () => {
    const party = await getPartyById("non-existent-id");
    expect(party).toBeNull();
  });

  it("returns null for deleted party", async () => {
    const created = await createTestParty(testUserId, { name: "DeletedParty" });
    await prisma.party.update({
      where: { id: created.id },
      data: { isDeleted: true },
    });

    const party = await getPartyById(created.id);
    expect(party).toBeNull();
  });
});

// ─── Update Party ──────────────────────────────────────────────────

describe("updateParty", () => {
  it("updates party name", async () => {
    const created = await createTestParty(testUserId, { name: "OldPartyName" });

    await updateParty({
      id: created.id,
      name: "NewPartyName",
      type: "CUSTOMER",
    });

    const updated = await getPartyById(created.id);
    expect(updated!.name).toBe("NewPartyName");
  });

  it("adds state to existing party (enables GST)", async () => {
    const created = await createTestParty(testUserId, { name: "NoState" });

    await updateParty({
      id: created.id,
      name: "NoState",
      type: "CUSTOMER",
      state: "Karnataka",
    });

    const updated = await getPartyById(created.id);
    expect(updated!.state).toBe("Karnataka");
  });

  it("throws error for non-existent party", async () => {
    await expect(
      updateParty({ id: "fake-id", name: "Nope", type: "CUSTOMER" })
    ).rejects.toThrow("Party not found");
  });
});

// ─── Delete Party ──────────────────────────────────────────────────

describe("deleteParty", () => {
  it("soft-deletes a party with no transactions", async () => {
    const created = await createTestParty(testUserId, { name: "DeleteMe-Party" });

    const result = await deleteParty(created.id);
    expect(result.success).toBe(true);

    const found = await getPartyById(created.id);
    expect(found).toBeNull();
  });

  it("throws error when deleting party with transactions", async () => {
    const account = await createTestAccount(testUserId, {
      name: "Cash-PartyDelete",
      currentBalance: 10000,
    });
    const party = await createTestParty(testUserId, { name: "HasTx-Party" });

    await createTransaction({
      accountId: account.id,
      partyId: party.id,
      amount: 5000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CREDIT",
    });

    await expect(deleteParty(party.id)).rejects.toThrow(
      "Cannot delete party with transactions"
    );
  });
});

// ─── Get Parties for User ──────────────────────────────────────────

describe("getPartiesForUser", () => {
  it("returns only active, non-deleted parties", async () => {
    const active = await createTestParty(testUserId, { name: "ActiveParty" });
    const deleted = await createTestParty(testUserId, { name: "DeletedParty2" });
    await prisma.party.update({
      where: { id: deleted.id },
      data: { isDeleted: true, isActive: false },
    });

    const parties = await getPartiesForUser();
    const names = parties.map((p) => p.name);

    expect(names).toContain("ActiveParty");
    expect(names).not.toContain("DeletedParty2");
  });
});

// ─── Adjust Party Balance ──────────────────────────────────────────

describe("adjustPartyBalance", () => {
  it("increases party balance (they owe us more)", async () => {
    const account = await createTestAccount(testUserId, {
      name: "Cash-PartyAdjUp",
      currentBalance: 10000,
    });
    const party = await createTestParty(testUserId, { name: "AdjustUp-Party" });

    // First create some credit to establish a balance
    await createTransaction({
      accountId: account.id,
      partyId: party.id,
      amount: 5000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CREDIT",
    });

    expect(await getPartyBalance(party.id)).toBe(5000);

    // Adjust upward to 8000
    await adjustPartyBalance({
      partyId: party.id,
      newBalance: 8000,
    });

    expect(await getPartyBalance(party.id)).toBe(8000);
  });

  it("decreases party balance (we owe them more)", async () => {
    const account = await createTestAccount(testUserId, {
      name: "Cash-PartyAdjDown",
      currentBalance: 10000,
    });
    const party = await createTestParty(testUserId, { name: "AdjustDown-Party" });

    // Create a credit purchase: we owe them 10000
    await createTransaction({
      accountId: account.id,
      partyId: party.id,
      amount: 10000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CREDIT",
    });

    expect(await getPartyBalance(party.id)).toBe(-10000);

    // Adjust to -5000 (partial settlement)
    await adjustPartyBalance({
      partyId: party.id,
      newBalance: -5000,
    });

    expect(await getPartyBalance(party.id)).toBe(-5000);
  });

  it("returns no-op when balance already matches", async () => {
    const party = await createTestParty(testUserId, { name: "NoChange-Party" });

    // Balance is 0, adjust to 0
    const result = await adjustPartyBalance({
      partyId: party.id,
      newBalance: 0,
    });

    expect(result.message).toBe("No adjustment needed");
  });

  it("adjustment creates CREDIT transaction (affects party balance)", async () => {
    const account = await createTestAccount(testUserId, {
      name: "Cash-CreditAdj",
      currentBalance: 10000,
    });
    const party = await createTestParty(testUserId, { name: "CreditAdj-Party" });

    await adjustPartyBalance({
      partyId: party.id,
      newBalance: 3000,
    });

    // Verify the adjustment transaction is CREDIT mode
    const tx = await prisma.transaction.findFirst({
      where: { partyId: party.id, category: "ADJUSTMENT" },
      orderBy: { createdAt: "desc" },
    });

    expect(tx).not.toBeNull();
    expect(tx!.paymentMode).toBe("CREDIT");
    expect(tx!.type).toBe("IN"); // positive = they owe us more
    expect(Number(tx!.amount)).toBe(3000);
  });
});
