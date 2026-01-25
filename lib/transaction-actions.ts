"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-utils";
import type { LedgerType, TransactionType } from "@/lib/types";

interface CreateTransactionInput {
  accountId: string;
  toAccountId?: string; // For transfers: destination account
  amount: number;
  type: TransactionType;
  partyId?: string;
  description?: string;
  category?: string;
  ledgerType: LedgerType;
  // Stock purchase fields
  stockId?: string;
  quantity?: number; // quantity in selected unit
  quantityUnit?: "KG" | "QUINTAL";
  pricePerUnit?: number;
  includeTax?: boolean; // 5% tax for trader purchases
}

// Tax rate for trader (non-farmer) purchases
const TRADER_TAX_RATE = 0.05; // 5%

export async function createTransaction(input: CreateTransactionInput) {
  const userId = await requireAuth();
  const {
    accountId,
    toAccountId,
    amount,
    type,
    partyId,
    description,
    category,
    ledgerType,
    stockId,
    quantity,
    quantityUnit,
    pricePerUnit,
    includeTax,
  } = input;

  // Verify account ownership
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId, isDeleted: false },
  });
  if (!account) {
    throw new Error("Account not found");
  }

  // For transfers, verify destination account
  let toAccount = null;
  if (type === "TRANSFER") {
    if (!toAccountId) {
      throw new Error("Destination account is required for transfers");
    }
    toAccount = await prisma.account.findFirst({
      where: { id: toAccountId, userId, isDeleted: false },
    });
    if (!toAccount) {
      throw new Error("Destination account not found");
    }
    if (toAccountId === accountId) {
      throw new Error("Cannot transfer to the same account");
    }
  }

  // Verify party ownership and get party type if provided
  let partyType: string | null = null;
  if (partyId) {
    const party = await prisma.party.findFirst({
      where: { id: partyId, userId, isDeleted: false },
    });
    if (!party) {
      throw new Error("Party not found");
    }
    partyType = party.type;
  }

  // Verify stock ownership if provided
  let stock = null;
  if (stockId) {
    stock = await prisma.stock.findFirst({
      where: { id: stockId, userId, isDeleted: false },
    });
    if (!stock) {
      throw new Error("Stock not found");
    }
  }

  // Calculate final amount with tax if applicable
  // Tax applies when buying from traders (non-farmers) - party type is not CUSTOMER
  let finalAmount = amount;
  let taxAmount = 0;
  const isTraderPurchase = partyType && partyType !== "CUSTOMER" && includeTax;

  if (isTraderPurchase) {
    taxAmount = Math.round(amount * TRADER_TAX_RATE * 100) / 100; // Round to 2 decimal places
    finalAmount = amount + taxAmount;
  }

  // Build description with stock and tax info
  let finalDescription = description || "";
  if (stockId && quantity && quantityUnit) {
    const qtyInKg = quantityUnit === "QUINTAL" ? quantity * 100 : quantity;
    const stockInfo = `Stock: ${quantity} ${quantityUnit} @ ₹${pricePerUnit}/${quantityUnit}`;
    finalDescription = finalDescription
      ? `${finalDescription} | ${stockInfo}`
      : stockInfo;
  }
  if (taxAmount > 0) {
    finalDescription = finalDescription
      ? `${finalDescription} | Tax (5%): ₹${taxAmount.toFixed(2)}`
      : `Tax (5%): ₹${taxAmount.toFixed(2)}`;
  }

  // Handle stock transaction - store directly in Transaction table
  let stockMovementType: "PURCHASE" | "SALE" | null = null;
  let qtyInKg: number | null = null;
  let pricePerKg: number | null = null;

  if (stockId && quantity && pricePerUnit) {
    // Convert quantity to KG for storage
    qtyInKg = quantityUnit === "QUINTAL" ? quantity * 100 : quantity;
    pricePerKg = quantityUnit === "QUINTAL" ? pricePerUnit / 100 : pricePerUnit;

    // Determine movement type based on transaction type
    // OUT (Debit) = buying stock = PURCHASE (stock increases)
    // IN (Credit) = selling stock = SALE (stock decreases)
    stockMovementType = type === "OUT" ? "PURCHASE" : "SALE";

    // Update stock quantity and average cost
    const currentQty = Number(stock!.quantity);
    const currentAvgCost = Number(stock!.avgCostPerKg);

    if (stockMovementType === "PURCHASE") {
      // Buying stock - increase quantity and recalculate weighted average cost
      const totalCurrentValue = currentQty * currentAvgCost;
      const newValue = qtyInKg * pricePerKg;
      const newQuantity = currentQty + qtyInKg;
      const newAvgCost = newQuantity > 0 ? (totalCurrentValue + newValue) / newQuantity : pricePerKg;

      await prisma.stock.update({
        where: { id: stockId },
        data: {
          quantity: newQuantity,
          avgCostPerKg: newAvgCost,
        },
      });
    } else {
      // Selling stock - decrease quantity (avg cost stays same)
      const newQuantity = Math.max(0, currentQty - qtyInKg);

      await prisma.stock.update({
        where: { id: stockId },
        data: {
          quantity: newQuantity,
        },
      });
    }
  }

  // Create transaction with stock fields embedded
  const transaction = await prisma.transaction.create({
    data: {
      amount: finalAmount,
      type,
      description: finalDescription || null,
      category,
      ledgerType,
      accountId,
      toAccountId: type === "TRANSFER" ? toAccountId : null,
      partyId: partyId || null,
      // Stock fields stored directly in transaction
      stockId: stockId || null,
      stockMovementType,
      stockQuantity: qtyInKg,
      stockPricePerKg: pricePerKg,
      userId,
    },
  });

  // Update account balance(s)
  if (type === "TRANSFER" && toAccountId) {
    // For transfers: decrease source account, increase destination account
    await prisma.account.update({
      where: { id: accountId },
      data: {
        currentBalance: {
          decrement: finalAmount,
        },
      },
    });
    await prisma.account.update({
      where: { id: toAccountId },
      data: {
        currentBalance: {
          increment: finalAmount,
        },
      },
    });
  } else {
    // For credit/debit: update single account
    const balanceChange = type === "IN" ? finalAmount : -finalAmount;
    await prisma.account.update({
      where: { id: accountId },
      data: {
        currentBalance: {
          increment: balanceChange,
        },
      },
    });
  }

  // NOTE: Party totalDue is now calculated dynamically from transactions
  // No need to update it here - it will be calculated when needed

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/parties");
  revalidatePath("/accounts");
  revalidatePath("/stock");

  return transaction;
}

export async function getAccountsForSelect() {
  const userId = await requireAuth();

  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true, isDeleted: false },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });
  return accounts;
}

export async function getPartiesForSelect() {
  const userId = await requireAuth();

  const parties = await prisma.party.findMany({
    where: { userId, isActive: true, isDeleted: false },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });
  return parties;
}

export async function getCategoriesForSelect() {
  const userId = await requireAuth();

  const categories = await prisma.category.findMany({
    where: {
      isDeleted: false,
      OR: [{ userId: null }, { userId }],
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });
  return categories;
}

export async function getTransactionById(id: string) {
  const userId = await requireAuth();

  // Support both migrated (with userId) and legacy (without userId) transactions
  const transaction = await prisma.transaction.findFirst({
    where: {
      id,
      isDeleted: false,
      OR: [{ userId }, { userId: null }],
    },
    include: {
      account: { select: { id: true, name: true } },
      party: { select: { id: true, name: true } },
      stock: { select: { id: true, name: true, unit: true } },
      // Legacy: also include old stockMovement for backwards compatibility
      stockMovement: {
        select: {
          id: true,
          stockId: true,
          quantity: true,
          pricePerKg: true,
          type: true,
          stock: { select: { id: true, name: true, unit: true } },
        },
      },
    },
  });

  if (!transaction) {
    return null;
  }

  // Check if stock data is in new embedded fields or legacy stockMovement
  const hasEmbeddedStock = transaction.stockId && transaction.stockQuantity;
  const hasLegacyStock = transaction.stockMovement;

  // Convert to plain object for Client Component compatibility
  return {
    id: transaction.id,
    accountId: transaction.accountId,
    amount: Number(transaction.amount),
    type: transaction.type as TransactionType,
    partyId: transaction.partyId,
    description: transaction.description,
    category: transaction.category,
    ledgerType: transaction.ledgerType as LedgerType,
    // Stock data - prefer embedded fields, fallback to legacy stockMovement
    stockMovement: hasEmbeddedStock ? {
      id: transaction.id, // Use transaction id as movement id for embedded
      stockId: transaction.stockId!,
      quantity: Number(transaction.stockQuantity),
      pricePerKg: Number(transaction.stockPricePerKg),
      type: transaction.stockMovementType,
      stock: transaction.stock,
    } : hasLegacyStock ? {
      id: transaction.stockMovement!.id,
      stockId: transaction.stockMovement!.stockId,
      quantity: Number(transaction.stockMovement!.quantity),
      pricePerKg: Number(transaction.stockMovement!.pricePerKg),
      type: transaction.stockMovement!.type,
      stock: transaction.stockMovement!.stock,
    } : null,
  };
}

interface UpdateTransactionInput {
  id: string;
  accountId: string;
  amount: number;
  type: TransactionType;
  partyId?: string;
  description?: string;
  category?: string;
  ledgerType: LedgerType;
}

export async function updateTransaction(input: UpdateTransactionInput) {
  const userId = await requireAuth();
  const { id, accountId, amount, type, partyId, description, category, ledgerType } = input;

  // Get the original transaction to calculate balance/due adjustments
  const originalTransaction = await prisma.transaction.findFirst({
    where: { id, userId, isDeleted: false },
  });

  if (!originalTransaction) {
    throw new Error("Transaction not found");
  }

  // Verify new account ownership
  const newAccount = await prisma.account.findFirst({
    where: { id: accountId, userId, isDeleted: false },
  });
  if (!newAccount) {
    throw new Error("Account not found");
  }

  // Verify new party ownership if provided
  if (partyId) {
    const newParty = await prisma.party.findFirst({
      where: { id: partyId, userId, isDeleted: false },
    });
    if (!newParty) {
      throw new Error("Party not found");
    }
  }

  const originalAmount = Number(originalTransaction.amount);
  const originalType = originalTransaction.type as TransactionType;
  const originalAccountId = originalTransaction.accountId;
  const originalPartyId = originalTransaction.partyId;

  // Revert the original account balance change
  const originalBalanceChange = originalType === "IN" ? -originalAmount : originalAmount;
  await prisma.account.update({
    where: { id: originalAccountId },
    data: {
      currentBalance: {
        increment: originalBalanceChange,
      },
    },
  });

  // Revert the original party due change if applicable
  if (originalPartyId) {
    const originalDueChange = originalType === "IN" ? originalAmount : -originalAmount;
    await prisma.party.update({
      where: { id: originalPartyId },
      data: {
        totalDue: {
          increment: originalDueChange,
        },
      },
    });
  }

  // Update the transaction
  const updatedTransaction = await prisma.transaction.update({
    where: { id },
    data: {
      amount,
      type,
      description,
      category,
      ledgerType,
      accountId,
      partyId: partyId || null,
    },
  });

  // Apply the new account balance change
  const newBalanceChange = type === "IN" ? amount : -amount;
  await prisma.account.update({
    where: { id: accountId },
    data: {
      currentBalance: {
        increment: newBalanceChange,
      },
    },
  });

  // Apply the new party due change if applicable
  if (partyId) {
    const newDueChange = type === "IN" ? -amount : amount;
    await prisma.party.update({
      where: { id: partyId },
      data: {
        totalDue: {
          increment: newDueChange,
        },
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/parties");
  revalidatePath("/accounts");

  return updatedTransaction;
}

export async function deleteTransaction(id: string) {
  const userId = await requireAuth();

  // Get the transaction to reverse balance changes
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId, isDeleted: false },
    include: {
      stock: true, // For embedded stock fields
      stockMovement: { // Legacy: for old stock movements
        include: {
          stock: true,
        },
      },
    },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  const amount = Number(transaction.amount);
  const type = transaction.type as TransactionType;
  const accountId = transaction.accountId;
  const toAccountId = transaction.toAccountId;

  // Reverse the account balance change(s)
  if (type === "TRANSFER" && toAccountId) {
    // For transfers: restore source account, reduce destination account
    await prisma.account.update({
      where: { id: accountId },
      data: {
        currentBalance: {
          increment: amount,
        },
      },
    });
    await prisma.account.update({
      where: { id: toAccountId },
      data: {
        currentBalance: {
          decrement: amount,
        },
      },
    });
  } else {
    // For credit/debit: reverse single account
    const balanceRevert = type === "IN" ? -amount : amount;
    await prisma.account.update({
      where: { id: accountId },
      data: {
        currentBalance: {
          increment: balanceRevert,
        },
      },
    });
  }

  // NOTE: Party totalDue is now calculated dynamically from transactions
  // No need to reverse it here - soft-deleted transactions are excluded from calculations

  // Handle stock reversal - check embedded fields first, then legacy stockMovement
  const hasEmbeddedStock = transaction.stockId && transaction.stockQuantity && transaction.stock;
  const hasLegacyStock = transaction.stockMovement && transaction.stockMovement.stock;

  if (hasEmbeddedStock) {
    // New: Stock data in embedded fields
    const stock = transaction.stock!;
    const movementQty = Number(transaction.stockQuantity);
    const movementType = transaction.stockMovementType;
    const currentStockQty = Number(stock.quantity);

    // Reverse the stock quantity change
    let newQuantity = currentStockQty;
    if (movementType === "PURCHASE") {
      newQuantity = currentStockQty - movementQty;
    } else if (movementType === "SALE" || movementType === "PROCESSING") {
      newQuantity = currentStockQty + movementQty;
    } else if (movementType === "ADJUSTMENT") {
      newQuantity = currentStockQty - movementQty;
    }

    await prisma.stock.update({
      where: { id: stock.id },
      data: { quantity: Math.max(0, newQuantity) },
    });
  } else if (hasLegacyStock) {
    // Legacy: Stock data in separate StockMovement table
    const movement = transaction.stockMovement!;
    const stock = movement.stock;
    const movementQty = Number(movement.quantity);
    const currentStockQty = Number(stock.quantity);

    // Reverse the stock quantity change
    let newQuantity = currentStockQty;
    if (movement.type === "PURCHASE") {
      newQuantity = currentStockQty - movementQty;
    } else if (movement.type === "SALE" || movement.type === "PROCESSING") {
      newQuantity = currentStockQty + movementQty;
    } else if (movement.type === "ADJUSTMENT") {
      newQuantity = currentStockQty - movementQty;
    }

    await prisma.stock.update({
      where: { id: stock.id },
      data: { quantity: Math.max(0, newQuantity) },
    });

    // Soft delete the legacy stock movement
    await prisma.stockMovement.update({
      where: { id: movement.id },
      data: { isDeleted: true },
    });
  }

  // Soft delete the transaction
  await prisma.transaction.update({
    where: { id },
    data: { isDeleted: true },
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/parties");
  revalidatePath("/accounts");
  revalidatePath("/stock");

  return { success: true };
}
