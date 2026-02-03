/**
 * Test helpers for integration tests.
 * Creates and cleans up test data in the real database.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Unique test user to isolate test data
const TEST_USER_PREFIX = "__test_user_";

export { prisma };

export async function createTestUser() {
  const uniqueId = `${TEST_USER_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: {
      username: uniqueId,
      passwordHash: "test-hash-not-real",
      name: "Test User",
    },
  });
  return user;
}

export async function createTestAccount(
  userId: string,
  overrides: {
    name?: string;
    type?: "CASH" | "BANK" | "LOAN_GIVEN" | "LOAN_TAKEN" | "GST_PAYABLE" | "GST_RECEIVABLE";
    currentBalance?: number;
  } = {}
) {
  return prisma.account.create({
    data: {
      name: overrides.name || "Test Account",
      type: overrides.type || "CASH",
      currentBalance: overrides.currentBalance ?? 10000,
      userId,
    },
  });
}

export async function createTestParty(
  userId: string,
  overrides: {
    name?: string;
    type?: "CUSTOMER" | "VENDOR" | "LENDER" | "BORROWER";
    state?: string;
  } = {}
) {
  return prisma.party.create({
    data: {
      name: overrides.name || "Test Party",
      type: overrides.type || "CUSTOMER",
      state: overrides.state || null,
      userId,
    },
  });
}

export async function createTestStock(
  userId: string,
  overrides: {
    name?: string;
    commodityType?: "TURMERIC_RAW" | "TURMERIC_POWDER" | "MAIZE" | "OTHER";
    quantity?: number;
    avgCostPerKg?: number;
    unit?: string;
  } = {}
) {
  return prisma.stock.create({
    data: {
      name: overrides.name || "Test Stock",
      commodityType: overrides.commodityType || "TURMERIC_RAW",
      quantity: overrides.quantity ?? 0,
      avgCostPerKg: overrides.avgCostPerKg ?? 0,
      unit: overrides.unit || "KG",
      userId,
    },
  });
}

export async function getAccountBalance(accountId: string): Promise<number> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  return Number(account!.currentBalance);
}

export async function getStockQuantity(stockId: string): Promise<number> {
  const stock = await prisma.stock.findUnique({ where: { id: stockId } });
  return Number(stock!.quantity);
}

export async function getStockAvgCost(stockId: string): Promise<number> {
  const stock = await prisma.stock.findUnique({ where: { id: stockId } });
  return Number(stock!.avgCostPerKg);
}

/**
 * Calculate party balance from CREDIT transactions (same as production logic).
 */
export async function getPartyBalance(partyId: string): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: { partyId, paymentMode: "CREDIT", isDeleted: false },
  });

  let balance = 0;
  for (const tx of transactions) {
    if (tx.type === "IN") {
      balance += Number(tx.amount);
    } else if (tx.type === "OUT") {
      balance -= Number(tx.amount);
    }
  }
  return balance;
}

/**
 * Clean up all data for a test user.
 */
export async function cleanupTestUser(userId: string) {
  // Delete in dependency order
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.stockMovement.deleteMany({ where: { userId } });
  await prisma.loan.deleteMany({ where: { userId } });
  await prisma.stock.deleteMany({ where: { userId } });
  await prisma.party.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

/**
 * Disconnect Prisma client (call in afterAll).
 */
export async function disconnectPrisma() {
  await prisma.$disconnect();
}
