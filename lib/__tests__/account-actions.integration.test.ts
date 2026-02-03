/**
 * Integration tests for account server actions.
 * Tests CRUD operations and balance adjustments against real database.
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
  prisma,
} from "./test-helpers";

// Mock Next.js server-side dependencies
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth-utils", () => ({
  requireAuth: vi.fn(),
}));

import {
  createAccount,
  getAccountById,
  updateAccount,
  deleteAccount,
  getAccountsForUser,
  adjustAccountBalance,
} from "@/lib/account-actions";
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

// ─── Create Account ────────────────────────────────────────────────

describe("createAccount", () => {
  it("creates a CASH account with default zero balance", async () => {
    const account = await createAccount({ name: "Test Cash", type: "CASH" });

    expect(account).toBeDefined();
    expect(account.name).toBe("Test Cash");
    expect(account.type).toBe("CASH");
    expect(Number(account.currentBalance)).toBe(0);
  });

  it("creates a BANK account with initial balance", async () => {
    const account = await createAccount({
      name: "Test Bank",
      type: "BANK",
      currentBalance: 50000,
    });

    expect(Number(account.currentBalance)).toBe(50000);
    expect(account.type).toBe("BANK");
  });

  it("creates a LOAN_GIVEN account", async () => {
    const account = await createAccount({
      name: "Loan to Raju",
      type: "LOAN_GIVEN",
      currentBalance: 25000,
    });

    expect(account.type).toBe("LOAN_GIVEN");
    expect(Number(account.currentBalance)).toBe(25000);
  });

  it("creates account with description", async () => {
    const account = await createAccount({
      name: "Petty Cash",
      type: "CASH",
      description: "For daily expenses",
    });

    expect(account.description).toBe("For daily expenses");
  });
});

// ─── Get Account ───────────────────────────────────────────────────

describe("getAccountById", () => {
  it("returns account with correct fields", async () => {
    const created = await createTestAccount(testUserId, {
      name: "GetById-Test",
      type: "CASH",
      currentBalance: 7500,
    });

    const account = await getAccountById(created.id);

    expect(account).not.toBeNull();
    expect(account!.name).toBe("GetById-Test");
    expect(account!.type).toBe("CASH");
    expect(account!.currentBalance).toBe(7500);
  });

  it("returns null for non-existent account", async () => {
    const account = await getAccountById("non-existent-id");
    expect(account).toBeNull();
  });

  it("returns null for deleted account", async () => {
    const created = await createTestAccount(testUserId, { name: "ToBeDeleted" });
    await prisma.account.update({
      where: { id: created.id },
      data: { isDeleted: true },
    });

    const account = await getAccountById(created.id);
    expect(account).toBeNull();
  });
});

// ─── Update Account ────────────────────────────────────────────────

describe("updateAccount", () => {
  it("updates account name", async () => {
    const created = await createTestAccount(testUserId, { name: "OldName" });

    await updateAccount({
      id: created.id,
      name: "NewName",
      type: "CASH",
    });

    const updated = await getAccountById(created.id);
    expect(updated!.name).toBe("NewName");
  });

  it("updates account type", async () => {
    const created = await createTestAccount(testUserId, { name: "TypeChange", type: "CASH" });

    await updateAccount({
      id: created.id,
      name: "TypeChange",
      type: "BANK",
    });

    const updated = await getAccountById(created.id);
    expect(updated!.type).toBe("BANK");
  });

  it("throws error for non-existent account", async () => {
    await expect(
      updateAccount({ id: "fake-id", name: "Nope", type: "CASH" })
    ).rejects.toThrow("Account not found");
  });
});

// ─── Delete Account ────────────────────────────────────────────────

describe("deleteAccount", () => {
  it("soft-deletes an account with no transactions", async () => {
    const created = await createTestAccount(testUserId, { name: "DeleteMe" });

    const result = await deleteAccount(created.id);
    expect(result.success).toBe(true);

    // Should not be findable anymore
    const found = await getAccountById(created.id);
    expect(found).toBeNull();
  });

  it("throws error when deleting account with transactions", async () => {
    const account = await createTestAccount(testUserId, {
      name: "HasTransactions",
      currentBalance: 10000,
    });

    // Create a transaction on this account
    await createTransaction({
      accountId: account.id,
      amount: 1000,
      type: "IN",
      ledgerType: "OFFICIAL",
      paymentMode: "CASH",
    });

    await expect(deleteAccount(account.id)).rejects.toThrow(
      "Cannot delete account with transactions"
    );
  });

  it("throws error for non-existent account", async () => {
    await expect(deleteAccount("fake-id")).rejects.toThrow("Account not found");
  });
});

// ─── Get Accounts for User ─────────────────────────────────────────

describe("getAccountsForUser", () => {
  it("returns only active, non-deleted accounts", async () => {
    const active = await createTestAccount(testUserId, { name: "ActiveAcct" });
    const deleted = await createTestAccount(testUserId, { name: "DeletedAcct" });
    await prisma.account.update({
      where: { id: deleted.id },
      data: { isDeleted: true, isActive: false },
    });

    const accounts = await getAccountsForUser();
    const names = accounts.map((a) => a.name);

    expect(names).toContain("ActiveAcct");
    expect(names).not.toContain("DeletedAcct");
  });
});

// ─── Adjust Account Balance ────────────────────────────────────────

describe("adjustAccountBalance", () => {
  it("increases balance and creates IN adjustment transaction", async () => {
    const account = await createTestAccount(testUserId, {
      name: "AdjustUp",
      currentBalance: 5000,
    });

    const result = await adjustAccountBalance({
      accountId: account.id,
      newBalance: 8000,
    });

    expect(result.success).toBe(true);
    expect(result.difference).toBe(3000);
    expect(await getAccountBalance(account.id)).toBe(8000);
  });

  it("decreases balance and creates OUT adjustment transaction", async () => {
    const account = await createTestAccount(testUserId, {
      name: "AdjustDown",
      currentBalance: 10000,
    });

    const result = await adjustAccountBalance({
      accountId: account.id,
      newBalance: 3000,
    });

    expect(result.success).toBe(true);
    expect(result.difference).toBe(-7000);
    expect(await getAccountBalance(account.id)).toBe(3000);
  });

  it("returns no-op when balance is already correct", async () => {
    const account = await createTestAccount(testUserId, {
      name: "NoChange",
      currentBalance: 5000,
    });

    const result = await adjustAccountBalance({
      accountId: account.id,
      newBalance: 5000,
    });

    expect(result.message).toBe("No adjustment needed");
  });

  it("creates adjustment transaction with reason", async () => {
    const account = await createTestAccount(testUserId, {
      name: "WithReason",
      currentBalance: 1000,
    });

    await adjustAccountBalance({
      accountId: account.id,
      newBalance: 2000,
      reason: "Physical cash count correction",
    });

    // Verify adjustment transaction was created
    const tx = await prisma.transaction.findFirst({
      where: { accountId: account.id, category: "Adjustment" },
      orderBy: { createdAt: "desc" },
    });

    expect(tx).not.toBeNull();
    expect(tx!.description).toContain("Physical cash count correction");
    expect(Number(tx!.amount)).toBe(1000);
    expect(tx!.type).toBe("IN");
  });

  it("adjustment to zero works correctly", async () => {
    const account = await createTestAccount(testUserId, {
      name: "ToZero",
      currentBalance: 15000,
    });

    await adjustAccountBalance({
      accountId: account.id,
      newBalance: 0,
    });

    expect(await getAccountBalance(account.id)).toBe(0);
  });
});
