/**
 * Integration tests for stock server actions.
 * Tests CRUD operations and quantity adjustments against real database.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  createTestUser,
  createTestAccount,
  createTestStock,
  getStockQuantity,
  getStockAvgCost,
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
  createStock,
  getStockById,
  updateStock,
  deleteStock,
  getStocksForUser,
  getStocksForSelect,
  adjustStockQuantity,
} from "@/lib/stock-actions";
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

// ─── Create Stock ──────────────────────────────────────────────────

describe("createStock", () => {
  it("creates stock with KG unit", async () => {
    const stock = await createStock({
      name: "Turmeric Finger KG",
      quantity: 500,
      unit: "KG",
      avgCostPerUnit: 50,
    });

    expect(stock).toBeDefined();
    expect(stock.name).toBe("Turmeric Finger KG");
    expect(Number(stock.quantity)).toBe(500); // stored as KG
    expect(Number(stock.avgCostPerKg)).toBe(50);
  });

  it("creates stock with QUINTAL unit (converts to KG)", async () => {
    const stock = await createStock({
      name: "Turmeric Finger Quintal",
      quantity: 5, // 5 quintals
      unit: "QUINTAL",
      avgCostPerUnit: 5000, // per quintal
    });

    expect(Number(stock.quantity)).toBe(500); // 5 * 100 = 500 KG
    expect(Number(stock.avgCostPerKg)).toBe(50); // 5000 / 100 = 50 per KG
  });

  it("creates stock with zero quantity", async () => {
    const stock = await createStock({
      name: "Empty Stock",
    });

    expect(Number(stock.quantity)).toBe(0);
    expect(Number(stock.avgCostPerKg)).toBe(0);
  });

  it("creates stock with location", async () => {
    const stock = await createStock({
      name: "Warehouse Stock",
      location: "Godown #1",
    });

    expect(stock.location).toBe("Godown #1");
  });
});

// ─── Get Stock ─────────────────────────────────────────────────────

describe("getStockById", () => {
  it("returns stock with correct fields", async () => {
    const created = await createTestStock(testUserId, {
      name: "GetById-Stock",
      quantity: 1000,
      avgCostPerKg: 45,
    });

    const stock = await getStockById(created.id);

    expect(stock).not.toBeNull();
    expect(stock!.name).toBe("GetById-Stock");
    expect(stock!.quantity).toBe(1000);
    expect(stock!.avgCostPerKg).toBe(45);
  });

  it("returns null for non-existent stock", async () => {
    const stock = await getStockById("non-existent-id");
    expect(stock).toBeNull();
  });

  it("returns null for deleted stock", async () => {
    const created = await createTestStock(testUserId, { name: "DeletedStock" });
    await prisma.stock.update({
      where: { id: created.id },
      data: { isDeleted: true },
    });

    const stock = await getStockById(created.id);
    expect(stock).toBeNull();
  });
});

// ─── Update Stock ──────────────────────────────────────────────────

describe("updateStock", () => {
  it("updates stock name", async () => {
    const created = await createTestStock(testUserId, { name: "OldStockName" });

    await updateStock({
      id: created.id,
      name: "NewStockName",
    });

    const updated = await getStockById(created.id);
    expect(updated!.name).toBe("NewStockName");
  });

  it("updates stock location", async () => {
    const created = await createTestStock(testUserId, { name: "LocationStock" });

    await updateStock({
      id: created.id,
      name: "LocationStock",
      location: "New Warehouse",
    });

    const updated = await getStockById(created.id);
    expect(updated!.location).toBe("New Warehouse");
  });

  it("throws error for non-existent stock", async () => {
    await expect(
      updateStock({ id: "fake-id", name: "Nope" })
    ).rejects.toThrow("Stock not found");
  });
});

// ─── Delete Stock ──────────────────────────────────────────────────

describe("deleteStock", () => {
  it("soft-deletes stock with no movements", async () => {
    const created = await createTestStock(testUserId, { name: "DeleteMe-Stock" });

    const result = await deleteStock(created.id);
    expect(result.success).toBe(true);

    const found = await getStockById(created.id);
    expect(found).toBeNull();
  });

  it("throws error for non-existent stock", async () => {
    await expect(deleteStock("fake-id")).rejects.toThrow("Stock not found");
  });
});

// ─── Get Stocks ────────────────────────────────────────────────────

describe("getStocksForUser", () => {
  it("returns only non-deleted stocks", async () => {
    const active = await createTestStock(testUserId, { name: "ActiveStock" });
    const deleted = await createTestStock(testUserId, { name: "DeletedStock2" });
    await prisma.stock.update({
      where: { id: deleted.id },
      data: { isDeleted: true },
    });

    const stocks = await getStocksForUser();
    const names = stocks.map((s) => s.name);

    expect(names).toContain("ActiveStock");
    expect(names).not.toContain("DeletedStock2");
  });
});

describe("getStocksForSelect", () => {
  it("returns id and name only", async () => {
    await createTestStock(testUserId, { name: "SelectStock" });

    const stocks = await getStocksForSelect();
    const found = stocks.find((s) => s.name === "SelectStock");

    expect(found).toBeDefined();
    expect(found!.id).toBeDefined();
    expect(found!.name).toBe("SelectStock");
  });
});

// ─── Adjust Stock Quantity ─────────────────────────────────────────

describe("adjustStockQuantity", () => {
  it("increases stock quantity (KG unit)", async () => {
    // Need an account for the adjustment transaction
    await createTestAccount(testUserId, { name: "Cash-StockAdj", type: "CASH" });

    const stock = await createTestStock(testUserId, {
      name: "AdjustUp-Stock",
      quantity: 500,
      avgCostPerKg: 50,
    });

    const result = await adjustStockQuantity({
      stockId: stock.id,
      newQuantity: 800, // in KG since stock.unit = "KG"
    });

    expect(result.success).toBe(true);
    expect(result.differenceInKg).toBe(300);
    expect(await getStockQuantity(stock.id)).toBe(800);
  });

  it("decreases stock quantity", async () => {
    await createTestAccount(testUserId, { name: "Cash-StockAdjDown", type: "CASH" });

    const stock = await createTestStock(testUserId, {
      name: "AdjustDown-Stock",
      quantity: 1000,
      avgCostPerKg: 40,
    });

    const result = await adjustStockQuantity({
      stockId: stock.id,
      newQuantity: 600,
    });

    expect(result.success).toBe(true);
    expect(result.differenceInKg).toBe(-400);
    expect(await getStockQuantity(stock.id)).toBe(600);
  });

  it("returns no-op when quantity unchanged", async () => {
    const stock = await createTestStock(testUserId, {
      name: "NoChange-Stock",
      quantity: 200,
    });

    const result = await adjustStockQuantity({
      stockId: stock.id,
      newQuantity: 200,
    });

    expect(result.message).toBe("No adjustment needed");
  });

  it("creates ADJUSTMENT transaction with correct type", async () => {
    await createTestAccount(testUserId, { name: "Cash-AdjTx", type: "CASH" });

    const stock = await createTestStock(testUserId, {
      name: "AdjTx-Stock",
      quantity: 100,
      avgCostPerKg: 60,
    });

    await adjustStockQuantity({
      stockId: stock.id,
      newQuantity: 150,
      reason: "Found extra bags in storage",
    });

    const tx = await prisma.transaction.findFirst({
      where: { stockId: stock.id, category: "Stock Adjustment" },
      orderBy: { createdAt: "desc" },
    });

    expect(tx).not.toBeNull();
    expect(tx!.type).toBe("IN"); // quantity increased
    expect(tx!.stockMovementType).toBe("ADJUSTMENT");
    expect(Number(tx!.stockQuantity)).toBe(50); // difference
    expect(tx!.description).toContain("Found extra bags in storage");
  });
});
