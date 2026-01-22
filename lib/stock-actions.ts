"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-utils";

type CommodityType = "TURMERIC_RAW" | "TURMERIC_POWDER" | "MAIZE" | "OTHER";

interface CreateStockInput {
  name: string;
  quantity?: number;
  unit?: string;
  avgCostPerKg?: number;
  location?: string;
}

export async function createStock(input: CreateStockInput) {
  const userId = await requireAuth();

  const stock = await prisma.stock.create({
    data: {
      name: input.name,
      commodityType: "OTHER" as CommodityType, // Default, not used for display
      quantity: input.quantity || 0,
      unit: input.unit || "KG",
      avgCostPerKg: input.avgCostPerKg || 0,
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
