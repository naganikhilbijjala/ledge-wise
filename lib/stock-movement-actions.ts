"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-utils";

type StockMovementType = "PURCHASE" | "PROCESSING" | "SALE" | "ADJUSTMENT";

interface CreateStockMovementInput {
  stockId: string;
  type: string;
  quantity: number;
  pricePerKg: number;
  partyId?: string;
  description?: string;
  vehicleNumber?: string;
  bagsCount?: number;
}

export async function createStockMovement(input: CreateStockMovementInput) {
  const userId = await requireAuth();

  // Verify stock ownership
  const stock = await prisma.stock.findFirst({
    where: { id: input.stockId, userId, isDeleted: false },
  });

  if (!stock) {
    throw new Error("Stock not found");
  }

  // Verify party ownership if provided
  if (input.partyId) {
    const party = await prisma.party.findFirst({
      where: { id: input.partyId, userId, isDeleted: false },
    });
    if (!party) {
      throw new Error("Party not found");
    }
  }

  const totalAmount = input.quantity * input.pricePerKg;
  const movementType = input.type as StockMovementType;

  // Create movement
  const movement = await prisma.stockMovement.create({
    data: {
      type: movementType,
      quantity: input.quantity,
      pricePerKg: input.pricePerKg,
      totalAmount,
      stockId: input.stockId,
      partyId: input.partyId || null,
      description: input.description || null,
      vehicleNumber: input.vehicleNumber || null,
      bagsCount: input.bagsCount || null,
      userId,
    },
  });

  // Update stock quantity based on movement type
  // PURCHASE and ADJUSTMENT (positive) increase stock
  // SALE and PROCESSING decrease stock
  const currentQty = Number(stock.quantity);
  const currentAvgCost = Number(stock.avgCostPerKg);
  let newQuantity = currentQty;
  let newAvgCost = currentAvgCost;

  if (movementType === "PURCHASE") {
    // Weighted average cost calculation
    const totalCurrentValue = currentQty * currentAvgCost;
    const newValue = input.quantity * input.pricePerKg;
    newQuantity = currentQty + input.quantity;
    newAvgCost = newQuantity > 0 ? (totalCurrentValue + newValue) / newQuantity : input.pricePerKg;
  } else if (movementType === "SALE" || movementType === "PROCESSING") {
    newQuantity = currentQty - input.quantity;
    // Keep avg cost same for sales/processing
  } else if (movementType === "ADJUSTMENT") {
    // Adjustment can be positive or negative
    newQuantity = currentQty + input.quantity;
  }

  await prisma.stock.update({
    where: { id: input.stockId },
    data: {
      quantity: newQuantity,
      avgCostPerKg: newAvgCost,
    },
  });

  revalidatePath("/stock");
  revalidatePath(`/stock/${input.stockId}`);
  revalidatePath("/");

  return movement;
}

export async function getStockMovementById(id: string) {
  const userId = await requireAuth();

  const movement = await prisma.stockMovement.findFirst({
    where: {
      id,
      userId,
      isDeleted: false,
    },
    include: {
      stock: { select: { id: true, name: true } },
      party: { select: { id: true, name: true } },
    },
  });

  if (!movement) {
    return null;
  }

  return {
    id: movement.id,
    type: movement.type as StockMovementType,
    quantity: Number(movement.quantity),
    pricePerKg: Number(movement.pricePerKg),
    totalAmount: Number(movement.totalAmount),
    stockId: movement.stockId,
    partyId: movement.partyId,
    description: movement.description,
    vehicleNumber: movement.vehicleNumber,
    bagsCount: movement.bagsCount,
    date: movement.date,
    stock: movement.stock,
    party: movement.party,
  };
}

export async function deleteStockMovement(id: string) {
  const userId = await requireAuth();

  // Get the movement to reverse stock changes
  const movement = await prisma.stockMovement.findFirst({
    where: { id, userId, isDeleted: false },
    include: { stock: true },
  });

  if (!movement) {
    throw new Error("Stock movement not found");
  }

  const stock = movement.stock;
  const movementType = movement.type as StockMovementType;
  const quantity = Number(movement.quantity);
  const currentQty = Number(stock.quantity);

  // Reverse the quantity change
  let newQuantity = currentQty;
  if (movementType === "PURCHASE" || movementType === "ADJUSTMENT") {
    newQuantity = currentQty - quantity;
  } else if (movementType === "SALE" || movementType === "PROCESSING") {
    newQuantity = currentQty + quantity;
  }

  // Update stock quantity
  await prisma.stock.update({
    where: { id: stock.id },
    data: { quantity: newQuantity },
  });

  // Soft delete the movement
  await prisma.stockMovement.update({
    where: { id },
    data: { isDeleted: true },
  });

  revalidatePath("/stock");
  revalidatePath(`/stock/${stock.id}`);
  revalidatePath("/");

  return { success: true };
}

export async function getStockMovementsForStock(stockId: string) {
  const userId = await requireAuth();

  const movements = await prisma.stockMovement.findMany({
    where: { stockId, userId, isDeleted: false },
    orderBy: { date: "desc" },
    include: {
      party: { select: { name: true } },
    },
  });

  return movements.map((m) => ({
    id: m.id,
    type: m.type as StockMovementType,
    quantity: Number(m.quantity),
    pricePerKg: Number(m.pricePerKg),
    totalAmount: Number(m.totalAmount),
    date: m.date,
    description: m.description,
    partyName: m.party?.name || null,
  }));
}
