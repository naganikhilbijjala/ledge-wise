/**
 * Integration tests for transaction edit (update) flows.
 * Verifies that editing a transaction correctly reverses old balances
 * and applies new ones.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  createTestUser,
  createTestAccount,
  createTestParty,
  createTestStock,
  getAccountBalance,
  getPartyBalance,
  getStockQuantity,
  getStockAvgCost,
  cleanupTestUser,
  disconnectPrisma,
} from "./test-helpers";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth-utils", () => ({
  requireAuth: vi.fn(),
}));

import { createTransaction, updateTransaction } from "@/lib/transaction-actions";
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

// ─── Edit Amount ───────────────────────────────────────────────────

describe("Edit transaction amount", () => {
  it("changing amount correctly reverses old and applies new", async () => {
    const cash = await createTestAccount(testUserId, {
      name: "Cash-EditAmt",
      currentBalance: 10000,
    });

    const tx = await createTransaction({
      accountId: cash.id,
      amount: 3000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });

    expect(await getAccountBalance(cash.id)).toBe(13000);

    await updateTransaction({
      id: tx.id,
      accountId: cash.id,
      amount: 5000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });

    // Should be 10000 + 5000 = 15000 (not 10000 + 3000 + 5000)
    expect(await getAccountBalance(cash.id)).toBe(15000);
  });
});

// ─── Edit Account ──────────────────────────────────────────────────

describe("Edit transaction account", () => {
  it("moving transaction to different account updates both balances", async () => {
    const cash = await createTestAccount(testUserId, {
      name: "Cash-EditAcct",
      currentBalance: 10000,
    });
    const bank = await createTestAccount(testUserId, {
      name: "Bank-EditAcct",
      currentBalance: 5000,
    });

    const tx = await createTransaction({
      accountId: cash.id,
      amount: 2000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });

    expect(await getAccountBalance(cash.id)).toBe(12000);

    // Move the receipt from Cash to Bank
    await updateTransaction({
      id: tx.id,
      accountId: bank.id,
      amount: 2000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });

    expect(await getAccountBalance(cash.id)).toBe(10000); // restored
    expect(await getAccountBalance(bank.id)).toBe(7000); // now has +2000
  });
});

// ─── Edit Type ─────────────────────────────────────────────────────

describe("Edit transaction type", () => {
  it("changing from IN to OUT reverses and re-applies correctly", async () => {
    const cash = await createTestAccount(testUserId, {
      name: "Cash-EditType",
      currentBalance: 10000,
    });

    const tx = await createTransaction({
      accountId: cash.id,
      amount: 3000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });

    expect(await getAccountBalance(cash.id)).toBe(13000);

    // Change from Receipt (IN) to Payment (OUT)
    await updateTransaction({
      id: tx.id,
      accountId: cash.id,
      amount: 3000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });

    // Should be 10000 - 3000 = 7000
    expect(await getAccountBalance(cash.id)).toBe(7000);
  });
});

// ─── Edit Payment Mode ─────────────────────────────────────────────

describe("Edit payment mode", () => {
  it("changing from CASH to CREDIT restores account balance", async () => {
    const cash = await createTestAccount(testUserId, {
      name: "Cash-EditMode",
      currentBalance: 10000,
    });
    const party = await createTestParty(testUserId, { name: "Party-EditMode" });

    const tx = await createTransaction({
      accountId: cash.id,
      partyId: party.id,
      amount: 4000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });

    expect(await getAccountBalance(cash.id)).toBe(14000);

    // Change to CREDIT - account should be unaffected
    await updateTransaction({
      id: tx.id,
      accountId: cash.id,
      partyId: party.id,
      amount: 4000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CREDIT",
    });

    expect(await getAccountBalance(cash.id)).toBe(10000); // restored
    expect(await getPartyBalance(party.id)).toBe(4000); // party now owes
  });
});

// ─── Edit Party ────────────────────────────────────────────────────

describe("Edit transaction party", () => {
  it("changing party updates balances for both parties", async () => {
    const cash = await createTestAccount(testUserId, {
      name: "Cash-EditParty",
      currentBalance: 10000,
    });
    const partyA = await createTestParty(testUserId, { name: "PartyA-Edit" });
    const partyB = await createTestParty(testUserId, { name: "PartyB-Edit" });

    const tx = await createTransaction({
      accountId: cash.id,
      partyId: partyA.id,
      amount: 6000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CREDIT",
    });

    expect(await getPartyBalance(partyA.id)).toBe(6000);

    // Move credit to partyB
    await updateTransaction({
      id: tx.id,
      accountId: cash.id,
      partyId: partyB.id,
      amount: 6000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CREDIT",
    });

    // partyA's transaction is updated (partyId changed), so balance recalculates
    expect(await getPartyBalance(partyA.id)).toBe(0);
    expect(await getPartyBalance(partyB.id)).toBe(6000);
  });
});

// ─── Edit Stock Transaction ────────────────────────────────────────

describe("Edit stock transaction", () => {
  it("changing stock quantity reverses old and applies new", async () => {
    const cash = await createTestAccount(testUserId, {
      name: "Cash-EditStock",
      currentBalance: 200000,
    });
    const stock = await createTestStock(testUserId, {
      name: "Turmeric-EditStock",
      quantity: 1000,
      avgCostPerKg: 50,
    });
    const party = await createTestParty(testUserId, { name: "Vendor-EditStock", type: "VENDOR" });

    // Purchase 500 KG
    const tx = await createTransaction({
      accountId: cash.id,
      partyId: party.id,
      amount: 30000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      stockId: stock.id,
      quantity: 500,
      quantityUnit: "KG",
      pricePerUnit: 60,
    });

    expect(await getStockQuantity(stock.id)).toBe(1500); // 1000 + 500

    // Edit to 800 KG instead
    await updateTransaction({
      id: tx.id,
      accountId: cash.id,
      partyId: party.id,
      amount: 48000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      stockId: stock.id,
      quantity: 800,
      quantityUnit: "KG",
      pricePerUnit: 60,
    });

    expect(await getStockQuantity(stock.id)).toBe(1800); // 1000 + 800
  });
});

// ─── Complex Edit: Amount + Account + Type ─────────────────────────

describe("Complex edit scenarios", () => {
  it("multiple successive edits maintain correct balance", async () => {
    const cash = await createTestAccount(testUserId, {
      name: "Cash-MultiEdit",
      currentBalance: 10000,
    });

    // Create Receipt: 10000 + 2000 = 12000
    const tx = await createTransaction({
      accountId: cash.id,
      amount: 2000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });
    expect(await getAccountBalance(cash.id)).toBe(12000);

    // Edit 1: Change amount to 5000 → 10000 + 5000 = 15000
    await updateTransaction({
      id: tx.id,
      accountId: cash.id,
      amount: 5000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });
    expect(await getAccountBalance(cash.id)).toBe(15000);

    // Edit 2: Change to Payment → 10000 - 5000 = 5000
    await updateTransaction({
      id: tx.id,
      accountId: cash.id,
      amount: 5000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });
    expect(await getAccountBalance(cash.id)).toBe(5000);
  });
});
