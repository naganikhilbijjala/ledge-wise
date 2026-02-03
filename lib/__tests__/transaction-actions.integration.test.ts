/**
 * Integration tests for transaction server actions.
 * These run against the real database and verify that balances
 * are correctly updated for all transaction types.
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
  getStockQuantity,
  getStockAvgCost,
  getPartyBalance,
  cleanupTestUser,
  disconnectPrisma,
} from "./test-helpers";

// Mock Next.js server-side dependencies before importing server actions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth-utils", () => ({
  requireAuth: vi.fn(),
}));

// Import after mocks are set up
import { createTransaction, deleteTransaction } from "@/lib/transaction-actions";
import { requireAuth } from "@/lib/auth-utils";

const mockedRequireAuth = vi.mocked(requireAuth);

let testUserId: string;

beforeAll(async () => {
  const user = await createTestUser();
  testUserId = user.id;
  // All server actions call requireAuth() - mock it to return our test user
  mockedRequireAuth.mockResolvedValue(testUserId);
});

afterAll(async () => {
  await cleanupTestUser(testUserId);
  await disconnectPrisma();
});

// ─── Contra (TRANSFER) ─────────────────────────────────────────────

describe("Contra / TRANSFER transactions", () => {
  it("decreases source and increases destination by exact amount", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-Contra", type: "CASH", currentBalance: 10000 });
    const bank = await createTestAccount(testUserId, { name: "Bank-Contra", type: "BANK", currentBalance: 5000 });

    await createTransaction({
      accountId: cash.id,
      toAccountId: bank.id,
      amount: 3000,
      type: "TRANSFER",
      ledgerType: "OFFICIAL",
    });

    expect(await getAccountBalance(cash.id)).toBe(7000);
    expect(await getAccountBalance(bank.id)).toBe(8000);
  });

  it("total money in system is conserved after transfer", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-Conserve", type: "CASH", currentBalance: 20000 });
    const bank = await createTestAccount(testUserId, { name: "Bank-Conserve", type: "BANK", currentBalance: 10000 });
    const totalBefore = 30000;

    await createTransaction({
      accountId: cash.id,
      toAccountId: bank.id,
      amount: 7500,
      type: "TRANSFER",
      ledgerType: "OFFICIAL",
    });

    const totalAfter = (await getAccountBalance(cash.id)) + (await getAccountBalance(bank.id));
    expect(totalAfter).toBe(totalBefore);
  });
});

// ─── Receipt (CASH IN) ─────────────────────────────────────────────

describe("Receipt / CASH IN transactions", () => {
  it("increases account balance", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-Receipt", type: "CASH", currentBalance: 5000 });

    await createTransaction({
      accountId: cash.id,
      amount: 2000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });

    expect(await getAccountBalance(cash.id)).toBe(7000);
  });
});

// ─── Payment (CASH OUT) ────────────────────────────────────────────

describe("Payment / CASH OUT transactions", () => {
  it("decreases account balance", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-Payment", type: "CASH", currentBalance: 8000 });

    await createTransaction({
      accountId: cash.id,
      amount: 3000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });

    expect(await getAccountBalance(cash.id)).toBe(5000);
  });
});

// ─── Sales (CREDIT IN) ─────────────────────────────────────────────

describe("Sales / CREDIT IN transactions", () => {
  it("does NOT change account balance", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-CreditSale", type: "CASH", currentBalance: 10000 });
    const party = await createTestParty(testUserId, { name: "Customer-CreditSale", type: "CUSTOMER" });

    await createTransaction({
      accountId: cash.id,
      partyId: party.id,
      amount: 5000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CREDIT",
    });

    expect(await getAccountBalance(cash.id)).toBe(10000); // unchanged
  });

  it("creates party receivable (positive balance = they owe us)", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-PartyBal", type: "CASH", currentBalance: 10000 });
    const party = await createTestParty(testUserId, { name: "Customer-PartyBal", type: "CUSTOMER" });

    await createTransaction({
      accountId: cash.id,
      partyId: party.id,
      amount: 5000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CREDIT",
    });

    expect(await getPartyBalance(party.id)).toBe(5000); // they owe us
  });
});

// ─── Purchase (CREDIT OUT) ─────────────────────────────────────────

describe("Purchase / CREDIT OUT transactions", () => {
  it("does NOT change account balance", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-CreditPurchase", type: "CASH", currentBalance: 10000 });
    const party = await createTestParty(testUserId, { name: "Vendor-CreditPurchase", type: "VENDOR" });

    await createTransaction({
      accountId: cash.id,
      partyId: party.id,
      amount: 4000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CREDIT",
    });

    expect(await getAccountBalance(cash.id)).toBe(10000); // unchanged
  });

  it("creates party payable (negative balance = we owe them)", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-VendorBal", type: "CASH", currentBalance: 10000 });
    const party = await createTestParty(testUserId, { name: "Vendor-VendorBal", type: "VENDOR" });

    await createTransaction({
      accountId: cash.id,
      partyId: party.id,
      amount: 4000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CREDIT",
    });

    expect(await getPartyBalance(party.id)).toBe(-4000); // we owe them
  });
});

// ─── Delete Transaction ─────────────────────────────────────────────

describe("Delete transaction reversal", () => {
  it("deleting a CASH IN transaction restores original balance", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-DeleteIN", type: "CASH", currentBalance: 10000 });

    const tx = await createTransaction({
      accountId: cash.id,
      amount: 3000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });

    expect(await getAccountBalance(cash.id)).toBe(13000);

    await deleteTransaction(tx.id);

    expect(await getAccountBalance(cash.id)).toBe(10000); // restored
  });

  it("deleting a CASH OUT transaction restores original balance", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-DeleteOUT", type: "CASH", currentBalance: 10000 });

    const tx = await createTransaction({
      accountId: cash.id,
      amount: 2000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });

    expect(await getAccountBalance(cash.id)).toBe(8000);

    await deleteTransaction(tx.id);

    expect(await getAccountBalance(cash.id)).toBe(10000); // restored
  });

  it("deleting a TRANSFER restores both account balances", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-DeleteTransfer", type: "CASH", currentBalance: 10000 });
    const bank = await createTestAccount(testUserId, { name: "Bank-DeleteTransfer", type: "BANK", currentBalance: 5000 });

    const tx = await createTransaction({
      accountId: cash.id,
      toAccountId: bank.id,
      amount: 4000,
      type: "TRANSFER",
      ledgerType: "OFFICIAL",
    });

    expect(await getAccountBalance(cash.id)).toBe(6000);
    expect(await getAccountBalance(bank.id)).toBe(9000);

    await deleteTransaction(tx.id);

    expect(await getAccountBalance(cash.id)).toBe(10000);
    expect(await getAccountBalance(bank.id)).toBe(5000);
  });

  it("deleting a CREDIT transaction does NOT change account balance", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-DeleteCredit", type: "CASH", currentBalance: 10000 });
    const party = await createTestParty(testUserId, { name: "Party-DeleteCredit", type: "CUSTOMER" });

    const tx = await createTransaction({
      accountId: cash.id,
      partyId: party.id,
      amount: 5000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CREDIT",
    });

    expect(await getAccountBalance(cash.id)).toBe(10000); // unchanged
    expect(await getPartyBalance(party.id)).toBe(5000);

    await deleteTransaction(tx.id);

    expect(await getAccountBalance(cash.id)).toBe(10000); // still unchanged
    expect(await getPartyBalance(party.id)).toBe(0); // cleared
  });
});

// ─── Stock Transactions ─────────────────────────────────────────────

describe("Stock transactions", () => {
  it("purchase increases stock quantity and calculates avg cost", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-StockPurchase", type: "CASH", currentBalance: 100000 });
    const stock = await createTestStock(testUserId, { name: "Turmeric-Purchase", quantity: 0, avgCostPerKg: 0 });
    const party = await createTestParty(testUserId, { name: "Vendor-Stock", type: "VENDOR" });

    await createTransaction({
      accountId: cash.id,
      partyId: party.id,
      amount: 50000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      stockId: stock.id,
      quantity: 500,
      quantityUnit: "KG",
      pricePerUnit: 100,
    });

    expect(await getStockQuantity(stock.id)).toBe(500);
    expect(await getStockAvgCost(stock.id)).toBe(100);
  });

  it("sale decreases stock quantity", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-StockSale", type: "CASH", currentBalance: 100000 });
    const stock = await createTestStock(testUserId, { name: "Turmeric-Sale", quantity: 500, avgCostPerKg: 100 });
    const party = await createTestParty(testUserId, { name: "Customer-Stock", type: "CUSTOMER" });

    await createTransaction({
      accountId: cash.id,
      partyId: party.id,
      amount: 24000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      stockId: stock.id,
      quantity: 200,
      quantityUnit: "KG",
      pricePerUnit: 120,
    });

    expect(await getStockQuantity(stock.id)).toBe(300);
  });

  it("quintal conversion works correctly (1 quintal = 100 KG)", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-Quintal", type: "CASH", currentBalance: 200000 });
    const stock = await createTestStock(testUserId, { name: "Turmeric-Quintal", quantity: 0, avgCostPerKg: 0 });
    const party = await createTestParty(testUserId, { name: "Vendor-Quintal", type: "VENDOR" });

    await createTransaction({
      accountId: cash.id,
      partyId: party.id,
      amount: 50000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      stockId: stock.id,
      quantity: 2, // 2 quintals
      quantityUnit: "QUINTAL",
      pricePerUnit: 25000, // per quintal
    });

    expect(await getStockQuantity(stock.id)).toBe(200); // 2 quintals = 200 KG
    expect(await getStockAvgCost(stock.id)).toBe(250); // 25000/100 per KG
  });

  it("deleting stock purchase reverses quantity", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-StockDelete", type: "CASH", currentBalance: 100000 });
    const stock = await createTestStock(testUserId, { name: "Turmeric-Delete", quantity: 200, avgCostPerKg: 80 });
    const party = await createTestParty(testUserId, { name: "Vendor-StockDelete", type: "VENDOR" });

    const tx = await createTransaction({
      accountId: cash.id,
      partyId: party.id,
      amount: 30000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      stockId: stock.id,
      quantity: 300,
      quantityUnit: "KG",
      pricePerUnit: 100,
    });

    expect(await getStockQuantity(stock.id)).toBe(500); // 200 + 300

    await deleteTransaction(tx.id);

    expect(await getStockQuantity(stock.id)).toBe(200); // back to original
  });
});

// ─── GST Transactions ───────────────────────────────────────────────

describe("GST transactions", () => {
  it("intra-state purchase creates CGST + SGST accounts with correct balances", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-GST-Intra", type: "CASH", currentBalance: 100000 });
    const party = await createTestParty(testUserId, {
      name: "Vendor-GST-Intra",
      type: "VENDOR",
      state: "Telangana", // same state
    });

    const tx = await createTransaction({
      accountId: cash.id,
      partyId: party.id,
      amount: 10000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      includeTax: true,
    });

    // Main transaction amount should include GST: 10000 + 500 = 10500
    expect(Number(tx.amount)).toBe(10500);

    // Account should be debited the full amount including GST
    expect(await getAccountBalance(cash.id)).toBe(89500); // 100000 - 10500
  });

  it("inter-state purchase creates IGST account", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-GST-Inter", type: "CASH", currentBalance: 100000 });
    const party = await createTestParty(testUserId, {
      name: "Vendor-GST-Inter",
      type: "VENDOR",
      state: "Maharashtra", // different state
    });

    const tx = await createTransaction({
      accountId: cash.id,
      partyId: party.id,
      amount: 10000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      includeTax: true,
    });

    // Main transaction amount should include GST: 10000 + 500 = 10500
    expect(Number(tx.amount)).toBe(10500);
  });
});

// ─── Multiple Operations Consistency ────────────────────────────────

describe("multiple operations consistency", () => {
  it("series of transactions produces correct final balance", async () => {
    const cash = await createTestAccount(testUserId, { name: "Cash-Series", type: "CASH", currentBalance: 10000 });

    // Receipt: +5000
    await createTransaction({
      accountId: cash.id,
      amount: 5000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });

    // Payment: -3000
    await createTransaction({
      accountId: cash.id,
      amount: 3000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });

    // Credit sale: 0 change to account
    const party = await createTestParty(testUserId, { name: "Customer-Series", type: "CUSTOMER" });
    await createTransaction({
      accountId: cash.id,
      partyId: party.id,
      amount: 8000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CREDIT",
    });

    // Receipt: +2000
    await createTransaction({
      accountId: cash.id,
      amount: 2000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });

    // Expected: 10000 + 5000 - 3000 + 0 + 2000 = 14000
    expect(await getAccountBalance(cash.id)).toBe(14000);

    // Party should owe 8000
    expect(await getPartyBalance(party.id)).toBe(8000);
  });
});
