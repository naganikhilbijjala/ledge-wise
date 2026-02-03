/**
 * Integration tests for day book server actions.
 * Tests opening/closing balances, daily summaries, and filtering.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  createTestUser,
  createTestAccount,
  getAccountBalance,
  cleanupTestUser,
  disconnectPrisma,
} from "./test-helpers";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth-utils", () => ({
  requireAuth: vi.fn(),
}));

import { createTransaction } from "@/lib/transaction-actions";
import { getDayBookData, getDayBookAccounts } from "@/lib/daybook-actions";
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

// ─── Day Book Data ─────────────────────────────────────────────────

describe("getDayBookData", () => {
  it("returns correct opening balance from transactions before date range", async () => {
    const cash = await createTestAccount(testUserId, {
      name: "Cash-DayBook-Opening",
      currentBalance: 0,
    });

    // Create a transaction on Jan 1
    await createTransaction({
      accountId: cash.id,
      amount: 5000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      date: new Date("2025-01-01T10:00:00"),
    });

    // Create a transaction on Jan 2
    await createTransaction({
      accountId: cash.id,
      amount: 3000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      date: new Date("2025-01-02T10:00:00"),
    });

    // Query day book starting Jan 3
    const dayBook = await getDayBookData(cash.id, "2025-01-03", "2025-01-03");

    // Opening balance should be 5000 + 3000 = 8000
    expect(dayBook.overallOpeningBalance).toBe(8000);
  });

  it("calculates daily summaries with inflow and outflow", async () => {
    const cash = await createTestAccount(testUserId, {
      name: "Cash-DayBook-Daily",
      currentBalance: 0,
    });

    const targetDate = "2025-02-15";

    // Two receipts and one payment on the same day
    await createTransaction({
      accountId: cash.id,
      amount: 10000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      date: new Date(`${targetDate}T09:00:00`),
    });

    await createTransaction({
      accountId: cash.id,
      amount: 5000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      date: new Date(`${targetDate}T12:00:00`),
    });

    await createTransaction({
      accountId: cash.id,
      amount: 3000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      date: new Date(`${targetDate}T15:00:00`),
    });

    const dayBook = await getDayBookData(cash.id, targetDate, targetDate);

    expect(dayBook.dailySummaries).toHaveLength(1);

    const summary = dayBook.dailySummaries[0];
    expect(summary.totalIn).toBe(15000);
    expect(summary.totalOut).toBe(3000);
    expect(summary.netChange).toBe(12000);
    expect(summary.transactionCount).toBe(3);
  });

  it("closing balance = opening + net change", async () => {
    const cash = await createTestAccount(testUserId, {
      name: "Cash-DayBook-Close",
      currentBalance: 0,
    });

    // Pre-date transaction for opening balance
    await createTransaction({
      accountId: cash.id,
      amount: 20000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      date: new Date("2025-03-01T10:00:00"),
    });

    // Target day transactions
    await createTransaction({
      accountId: cash.id,
      amount: 8000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      date: new Date("2025-03-05T10:00:00"),
    });

    await createTransaction({
      accountId: cash.id,
      amount: 2000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      date: new Date("2025-03-05T14:00:00"),
    });

    const dayBook = await getDayBookData(cash.id, "2025-03-05", "2025-03-05");

    expect(dayBook.overallOpeningBalance).toBe(20000);
    expect(dayBook.overallClosingBalance).toBe(26000); // 20000 + 8000 - 2000
    expect(dayBook.totalIn).toBe(8000);
    expect(dayBook.totalOut).toBe(2000);
  });

  it("multi-day range has correct running balance across days", async () => {
    const cash = await createTestAccount(testUserId, {
      name: "Cash-DayBook-Multi",
      currentBalance: 0,
    });

    // Day 1: +10000
    await createTransaction({
      accountId: cash.id,
      amount: 10000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      date: new Date("2025-04-01T10:00:00"),
    });

    // Day 2: -3000
    await createTransaction({
      accountId: cash.id,
      amount: 3000,
      type: "OUT",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      date: new Date("2025-04-02T10:00:00"),
    });

    // Day 3: +5000
    await createTransaction({
      accountId: cash.id,
      amount: 5000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      date: new Date("2025-04-03T10:00:00"),
    });

    const dayBook = await getDayBookData(cash.id, "2025-04-01", "2025-04-03");

    expect(dayBook.dailySummaries).toHaveLength(3);

    // Day 1: opening=0, closing=10000
    expect(dayBook.dailySummaries[0].openingBalance).toBe(0);
    expect(dayBook.dailySummaries[0].closingBalance).toBe(10000);

    // Day 2: opening=10000, closing=7000
    expect(dayBook.dailySummaries[1].openingBalance).toBe(10000);
    expect(dayBook.dailySummaries[1].closingBalance).toBe(7000);

    // Day 3: opening=7000, closing=12000
    expect(dayBook.dailySummaries[2].openingBalance).toBe(7000);
    expect(dayBook.dailySummaries[2].closingBalance).toBe(12000);
  });

  it("empty date range shows correct opening/closing with no transactions", async () => {
    const cash = await createTestAccount(testUserId, {
      name: "Cash-DayBook-Empty",
      currentBalance: 0,
    });

    await createTransaction({
      accountId: cash.id,
      amount: 15000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      date: new Date("2025-05-01T10:00:00"),
    });

    // Query a range with no transactions
    const dayBook = await getDayBookData(cash.id, "2025-06-01", "2025-06-01");

    expect(dayBook.overallOpeningBalance).toBe(15000);
    expect(dayBook.overallClosingBalance).toBe(15000); // no change
    expect(dayBook.dailySummaries).toHaveLength(0); // no transactions
  });

  it("all-accounts mode includes transactions from multiple accounts", async () => {
    const cash = await createTestAccount(testUserId, {
      name: "Cash-DayBook-All",
      currentBalance: 0,
    });
    const bank = await createTestAccount(testUserId, {
      name: "Bank-DayBook-All",
      currentBalance: 0,
    });

    await createTransaction({
      accountId: cash.id,
      amount: 5000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      date: new Date("2025-07-01T10:00:00"),
    });

    await createTransaction({
      accountId: bank.id,
      amount: 8000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
      date: new Date("2025-07-01T12:00:00"),
    });

    // Pass null for accountId = all accounts
    const dayBook = await getDayBookData(null, "2025-07-01", "2025-07-01");

    expect(dayBook.accountName).toBe("All Accounts");
    expect(dayBook.totalIn).toBeGreaterThanOrEqual(13000); // at least our 5k + 8k
  });
});

// ─── Day Book Accounts ─────────────────────────────────────────────

describe("getDayBookAccounts", () => {
  it("returns active accounts for filter dropdown", async () => {
    await createTestAccount(testUserId, { name: "DayBookFilter-Cash", type: "CASH" });

    const accounts = await getDayBookAccounts();
    const found = accounts.find((a) => a.name === "DayBookFilter-Cash");

    expect(found).toBeDefined();
    expect(found!.type).toBe("CASH");
  });
});
