"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-utils";

type CommodityType = "TURMERIC_RAW" | "TURMERIC_POWDER" | "MAIZE" | "OTHER";

interface CreateStockInput {
  name: string;
  quantity?: number; // Quantity in the selected unit
  unit?: string;
  avgCostPerUnit?: number; // Cost per unit in the selected unit
  location?: string;
}

export async function createStock(input: CreateStockInput) {
  const userId = await requireAuth();

  const unit = input.unit || "KG";
  const quantity = input.quantity || 0;
  const costPerUnit = input.avgCostPerUnit || 0;

  // Convert quantity and cost to KG for storage
  // Internally everything is stored in KG
  let quantityInKg = quantity;
  let costPerKg = costPerUnit;

  if (unit === "QUINTAL") {
    quantityInKg = quantity * 100; // 1 Quintal = 100 KG
    costPerKg = costPerUnit / 100; // Cost per KG = Cost per Quintal / 100
  } else if (unit === "TON") {
    quantityInKg = quantity * 1000; // 1 Ton = 1000 KG
    costPerKg = costPerUnit / 1000; // Cost per KG = Cost per Ton / 1000
  }
  // For KG and BAGS, store as-is (BAGS assumes 1 bag = 1 KG for simplicity)

  const stock = await prisma.stock.create({
    data: {
      name: input.name,
      commodityType: "OTHER" as CommodityType, // Default, not used for display
      quantity: quantityInKg,
      unit: unit,
      avgCostPerKg: costPerKg,
      location: input.location || null,
      userId,
    },
  });

  revalidatePath("/stock");
  revalidatePath("/");

  return stock;
}

export async function getStockById(id: string) {
  const userId = await requireAuth();

  const stock = await prisma.stock.findFirst({
    where: {
      id,
      userId,
      isDeleted: false,
    },
  });

  if (!stock) {
    return null;
  }

  return {
    id: stock.id,
    name: stock.name,
    commodityType: stock.commodityType as CommodityType,
    quantity: Number(stock.quantity),
    unit: stock.unit,
    avgCostPerKg: Number(stock.avgCostPerKg),
    location: stock.location,
  };
}

interface UpdateStockInput {
  id: string;
  name: string;
  unit?: string;
  location?: string;
}

export async function updateStock(input: UpdateStockInput) {
  const userId = await requireAuth();

  // Verify ownership
  const existing = await prisma.stock.findFirst({
    where: { id: input.id, userId, isDeleted: false },
  });

  if (!existing) {
    throw new Error("Stock not found");
  }

  const stock = await prisma.stock.update({
    where: { id: input.id },
    data: {
      name: input.name,
      unit: input.unit || "KG",
      location: input.location || null,
    },
  });

  revalidatePath("/stock");
  revalidatePath(`/stock/${input.id}`);
  revalidatePath("/");

  return stock;
}

export async function deleteStock(id: string) {
  const userId = await requireAuth();

  // Verify ownership
  const existing = await prisma.stock.findFirst({
    where: { id, userId, isDeleted: false },
  });

  if (!existing) {
    throw new Error("Stock not found");
  }

  // Check if stock has movements
  const movementCount = await prisma.stockMovement.count({
    where: { stockId: id, isDeleted: false },
  });

  if (movementCount > 0) {
    throw new Error(
      "Cannot delete stock with movements. Delete movements first."
    );
  }

  // Soft delete
  await prisma.stock.update({
    where: { id },
    data: { isDeleted: true },
  });

  revalidatePath("/stock");
  revalidatePath("/");

  return { success: true };
}

export async function getStocksForUser() {
  const userId = await requireAuth();

  const stocks = await prisma.stock.findMany({
    where: { userId, isDeleted: false },
    orderBy: [{ commodityType: "asc" }, { name: "asc" }],
  });

  return stocks.map((stock) => ({
    id: stock.id,
    name: stock.name,
    commodityType: stock.commodityType as CommodityType,
    quantity: Number(stock.quantity),
    unit: stock.unit,
    avgCostPerKg: Number(stock.avgCostPerKg),
    location: stock.location,
  }));
}

export async function getStocksForSelect() {
  const userId = await requireAuth();

  const stocks = await prisma.stock.findMany({
    where: { userId, isDeleted: false },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return stocks;
}

interface AdjustStockQuantityInput {
  stockId: string;
  newQuantity: number; // In the stock's display unit (QUINTAL or KG)
  reason?: string;
}

export async function adjustStockQuantity(input: AdjustStockQuantityInput) {
  const userId = await requireAuth();
  const { stockId, newQuantity, reason } = input;

  // Verify ownership and get stock details
  const stock = await prisma.stock.findFirst({
    where: { id: stockId, userId, isDeleted: false },
  });

  if (!stock) {
    throw new Error("Stock not found");
  }

  const unit = stock.unit || "KG";
  const isQuintal = unit === "QUINTAL";

  // Convert new quantity to KG for storage
  const newQuantityInKg = isQuintal ? newQuantity * 100 : newQuantity;
  const currentQuantityInKg = Number(stock.quantity);

  // Calculate difference in KG
  const differenceInKg = newQuantityInKg - currentQuantityInKg;

  if (differenceInKg === 0) {
    return { success: true, message: "No adjustment needed" };
  }

  // Display values for description
  const currentDisplayQty = isQuintal ? currentQuantityInKg / 100 : currentQuantityInKg;
  const unitLabel = isQuintal ? "Quintals" : "KG";

  const description = reason
    ? `Stock Adjustment: ${reason}`
    : `Stock Adjustment (${currentDisplayQty} → ${newQuantity} ${unitLabel})`;

  // Create a transaction with stock adjustment
  // For adjustments: positive difference = stock found more = Credit to account
  // negative difference = stock found less = Debit from account
  const adjustmentType = differenceInKg > 0 ? "IN" : "OUT";

  // Create transaction with embedded stock fields
  await prisma.transaction.create({
    data: {
      amount: 0, // No monetary value for pure quantity adjustment
      type: adjustmentType,
      description,
      category: "Stock Adjustment",
      ledgerType: "PARALLEL",
      // Use a default account - we need to fetch one
      accountId: await getDefaultAccountId(userId),
      userId,
      // Stock fields
      stockId,
      stockMovementType: "ADJUSTMENT",
      stockQuantity: Math.abs(differenceInKg),
      stockPricePerKg: Number(stock.avgCostPerKg), // Use current avg cost
    },
  });

  // Update stock quantity directly
  await prisma.stock.update({
    where: { id: stockId },
    data: {
      quantity: newQuantityInKg,
    },
  });

  revalidatePath("/stock");
  revalidatePath(`/stock/${stockId}`);
  revalidatePath("/transactions");
  revalidatePath("/");

  return { success: true, differenceInKg };
}

// Helper to get a default account for stock adjustments
async function getDefaultAccountId(userId: string): Promise<string> {
  // Try to find a CASH account first
  let account = await prisma.account.findFirst({
    where: { userId, type: "CASH", isDeleted: false, isActive: true },
  });

  // If no cash account, get any active account
  if (!account) {
    account = await prisma.account.findFirst({
      where: { userId, isDeleted: false, isActive: true },
    });
  }

  if (!account) {
    throw new Error("No active account found. Please create an account first.");
  }

  return account.id;
}
