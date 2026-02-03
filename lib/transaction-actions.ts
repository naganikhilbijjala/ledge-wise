"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-utils";
import type { LedgerType, TransactionType, PaymentMode } from "@/lib/types";
import {
  calculateGst,
  calculateBalanceChange,
  calculateTransferBalanceChanges,
  calculateBalanceReversal,
  calculateTransferReversal,
  calculateStockAfterPurchase,
  calculateStockAfterSale,
  convertToKg,
  convertPriceToPerKg,
  getStockMovementType,
  reverseStockChange,
  BUSINESS_STATE,
  GST_RATE,
} from "@/lib/calculations";

interface CreateTransactionInput {
  accountId: string;
  toAccountId?: string; // For transfers: destination account
  amount: number;
  type: TransactionType;
  partyId?: string;
  description?: string;
  category?: string;
  ledgerType: LedgerType;
  paymentMode?: PaymentMode; // CASH = settled, CREDIT = affects party balance
  date?: Date; // Transaction date
  // Stock purchase fields
  stockId?: string;
  quantity?: number; // quantity in selected unit
  quantityUnit?: "KG" | "QUINTAL";
  pricePerUnit?: number;
  includeTax?: boolean; // 5% tax for trader purchases
}

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
    paymentMode,
    date,
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

  // Verify party ownership and get party state for GST
  let partyState: string | null = null;
  if (partyId) {
    const party = await prisma.party.findFirst({
      where: { id: partyId, userId, isDeleted: false },
    });
    if (!party) {
      throw new Error("Party not found");
    }
    partyState = party.state;
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

  // Calculate GST based on party's state
  const gst = calculateGst(amount, partyState, BUSINESS_STATE, !!includeTax);
  const { cgstAmount, sgstAmount, igstAmount, totalGstAmount, finalAmount, isSameState, isInterState } = gst;

  // Build description with stock and GST info
  let finalDescription = description || "";
  if (stockId && quantity && quantityUnit) {
    const stockInfo = `Stock: ${quantity} ${quantityUnit} @ ₹${pricePerUnit}/${quantityUnit}`;
    finalDescription = finalDescription
      ? `${finalDescription} | ${stockInfo}`
      : stockInfo;
  }
  if (totalGstAmount > 0) {
    let gstInfo = "";
    if (isSameState) {
      gstInfo = `CGST: ₹${cgstAmount.toFixed(2)} + SGST: ₹${sgstAmount.toFixed(2)}`;
    } else {
      gstInfo = `IGST: ₹${igstAmount.toFixed(2)}`;
    }
    finalDescription = finalDescription
      ? `${finalDescription} | ${gstInfo}`
      : gstInfo;
  }

  // Handle stock transaction - store directly in Transaction table
  let stockMovementType: "PURCHASE" | "SALE" | null = null;
  let qtyInKg: number | null = null;
  let pricePerKg: number | null = null;

  if (stockId && quantity && pricePerUnit) {
    qtyInKg = convertToKg(quantity, quantityUnit || "KG");
    pricePerKg = convertPriceToPerKg(pricePerUnit, quantityUnit || "KG");
    stockMovementType = getStockMovementType(type);

    const currentQty = Number(stock!.quantity);
    const currentAvgCost = Number(stock!.avgCostPerKg);

    if (stockMovementType === "PURCHASE") {
      const { newQuantity, newAvgCost } = calculateStockAfterPurchase(currentQty, currentAvgCost, qtyInKg, pricePerKg);
      await prisma.stock.update({
        where: { id: stockId },
        data: { quantity: newQuantity, avgCostPerKg: newAvgCost },
      });
    } else {
      const { newQuantity } = calculateStockAfterSale(currentQty, qtyInKg);
      await prisma.stock.update({
        where: { id: stockId },
        data: { quantity: newQuantity },
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
      paymentMode: paymentMode || "CASH",
      date: date || new Date(),
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

  // Post GST to separate accounts if applicable
  if (totalGstAmount > 0) {
    // Determine GST account type based on transaction type
    // Purchase (OUT) = Input GST (GST_RECEIVABLE - we can claim it)
    // Sale (IN) = Output GST (GST_PAYABLE - we need to pay it)
    const gstAccountType = type === "OUT" ? "GST_RECEIVABLE" : "GST_PAYABLE";

    // Find or create GST accounts
    const findOrCreateGstAccount = async (name: string, accountType: string) => {
      let gstAccount = await prisma.account.findFirst({
        where: { userId, name, type: accountType as "GST_PAYABLE" | "GST_RECEIVABLE", isDeleted: false },
      });
      if (!gstAccount) {
        gstAccount = await prisma.account.create({
          data: {
            name,
            type: accountType as "GST_PAYABLE" | "GST_RECEIVABLE",
            currentBalance: 0,
            userId,
          },
        });
      }
      return gstAccount;
    };

    const transactionDate = date || new Date();

    if (isSameState && cgstAmount > 0) {
      // Post CGST
      const cgstAccount = await findOrCreateGstAccount(
        type === "OUT" ? "CGST Input" : "CGST Output",
        gstAccountType
      );
      await prisma.transaction.create({
        data: {
          amount: cgstAmount,
          type: type === "OUT" ? "OUT" : "IN",
          description: `CGST @ 2.5% on ${description || "transaction"}`,
          category: "GST",
          ledgerType,
          paymentMode: "CASH",
          date: transactionDate,
          accountId: cgstAccount.id,
          partyId: partyId || null,
          userId,
        },
      });
      // Update GST account balance
      await prisma.account.update({
        where: { id: cgstAccount.id },
        data: { currentBalance: { increment: cgstAmount } },
      });

      // Post SGST
      const sgstAccount = await findOrCreateGstAccount(
        type === "OUT" ? "SGST Input" : "SGST Output",
        gstAccountType
      );
      await prisma.transaction.create({
        data: {
          amount: sgstAmount,
          type: type === "OUT" ? "OUT" : "IN",
          description: `SGST @ 2.5% on ${description || "transaction"}`,
          category: "GST",
          ledgerType,
          paymentMode: "CASH",
          date: transactionDate,
          accountId: sgstAccount.id,
          partyId: partyId || null,
          userId,
        },
      });
      await prisma.account.update({
        where: { id: sgstAccount.id },
        data: { currentBalance: { increment: sgstAmount } },
      });
    } else if (isInterState && igstAmount > 0) {
      // Post IGST
      const igstAccount = await findOrCreateGstAccount(
        type === "OUT" ? "IGST Input" : "IGST Output",
        gstAccountType
      );
      await prisma.transaction.create({
        data: {
          amount: igstAmount,
          type: type === "OUT" ? "OUT" : "IN",
          description: `IGST @ 5% on ${description || "transaction"}`,
          category: "GST",
          ledgerType,
          paymentMode: "CASH",
          date: transactionDate,
          accountId: igstAccount.id,
          partyId: partyId || null,
          userId,
        },
      });
      await prisma.account.update({
        where: { id: igstAccount.id },
        data: { currentBalance: { increment: igstAmount } },
      });
    }
  }

  // Update account balance(s)
  if (type === "TRANSFER" && toAccountId) {
    const { sourceChange, destinationChange } = calculateTransferBalanceChanges(finalAmount);
    await prisma.account.update({
      where: { id: accountId },
      data: { currentBalance: { increment: sourceChange } },
    });
    await prisma.account.update({
      where: { id: toAccountId },
      data: { currentBalance: { increment: destinationChange } },
    });
  } else {
    const balanceChange = calculateBalanceChange(type, finalAmount, (paymentMode || "CASH") as PaymentMode);
    if (balanceChange !== 0) {
      await prisma.account.update({
        where: { id: accountId },
        data: { currentBalance: { increment: balanceChange } },
      });
    }
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
      state: true,
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
    paymentMode: transaction.paymentMode as PaymentMode,
    date: transaction.date,
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
  paymentMode?: PaymentMode;
  date?: Date; // Transaction date
  // Stock purchase fields
  stockId?: string;
  quantity?: number;
  quantityUnit?: "KG" | "QUINTAL";
  pricePerUnit?: number;
  includeTax?: boolean;
}

export async function updateTransaction(input: UpdateTransactionInput) {
  const userId = await requireAuth();
  const { id, accountId, amount, type, partyId, description, category, ledgerType, paymentMode, date, stockId, quantity, quantityUnit, pricePerUnit, includeTax } = input;

  // Get the original transaction to calculate balance/due adjustments
  const originalTransaction = await prisma.transaction.findFirst({
    where: { id, userId, isDeleted: false },
    include: {
      stock: true,
    },
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

  // Verify new party ownership and get party type if provided
  let partyType: string | null = null;
  if (partyId) {
    const newParty = await prisma.party.findFirst({
      where: { id: partyId, userId, isDeleted: false },
    });
    if (!newParty) {
      throw new Error("Party not found");
    }
    partyType = newParty.type;
  }

  // Verify stock ownership if provided
  if (stockId) {
    const stockExists = await prisma.stock.findFirst({
      where: { id: stockId, userId, isDeleted: false },
    });
    if (!stockExists) {
      throw new Error("Stock not found");
    }
  }

  const originalAmount = Number(originalTransaction.amount);
  const originalType = originalTransaction.type as TransactionType;
  const originalAccountId = originalTransaction.accountId;
  const originalPaymentMode = (originalTransaction.paymentMode || "CASH") as PaymentMode;
  const originalToAccountId = originalTransaction.toAccountId;

  // Revert the original account balance change
  if (originalType === "TRANSFER" && originalToAccountId) {
    const { sourceChange, destinationChange } = calculateTransferReversal(originalAmount);
    await prisma.account.update({
      where: { id: originalAccountId },
      data: { currentBalance: { increment: sourceChange } },
    });
    await prisma.account.update({
      where: { id: originalToAccountId },
      data: { currentBalance: { increment: destinationChange } },
    });
  } else {
    const reversal = calculateBalanceReversal(originalType, originalAmount, originalPaymentMode);
    if (reversal !== 0) {
      await prisma.account.update({
        where: { id: originalAccountId },
        data: { currentBalance: { increment: reversal } },
      });
    }
  }

  // Handle stock reversal if original transaction had stock
  const hadOriginalStock = originalTransaction.stockId && originalTransaction.stockQuantity;
  if (hadOriginalStock && originalTransaction.stock) {
    const originalStockQty = Number(originalTransaction.stockQuantity);
    const originalStockType = originalTransaction.stockMovementType;
    const currentStockQty = Number(originalTransaction.stock.quantity);

    const revertedQuantity = reverseStockChange(currentStockQty, originalStockQty, originalStockType || "");

    await prisma.stock.update({
      where: { id: originalTransaction.stockId! },
      data: { quantity: Math.max(0, revertedQuantity) },
    });
  }

  // Calculate final amount with tax if applicable for stock transactions
  let finalAmount = amount;
  let taxAmount = 0;
  const isTraderPurchase = partyType && partyType !== "CUSTOMER" && includeTax;

  if (isTraderPurchase && stockId) {
    taxAmount = Math.round(amount * GST_RATE * 100) / 100;
    finalAmount = amount + taxAmount;
  }

  // Build description with stock and tax info
  let finalDescription = description || "";
  if (stockId && quantity && quantityUnit) {
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

  // Prepare new stock data
  let stockMovementType: "PURCHASE" | "SALE" | null = null;
  let qtyInKg: number | null = null;
  let pricePerKg: number | null = null;

  if (stockId && quantity && pricePerUnit) {
    // Re-fetch the stock to get the current quantity AFTER reversal
    const freshStock = await prisma.stock.findFirst({
      where: { id: stockId, userId, isDeleted: false },
    });

    if (!freshStock) {
      throw new Error("Stock not found");
    }

    qtyInKg = convertToKg(quantity, quantityUnit || "KG");
    pricePerKg = convertPriceToPerKg(pricePerUnit, quantityUnit || "KG");
    stockMovementType = getStockMovementType(type);

    const currentQty = Number(freshStock.quantity);
    const currentAvgCost = Number(freshStock.avgCostPerKg);

    if (stockMovementType === "PURCHASE") {
      const { newQuantity, newAvgCost } = calculateStockAfterPurchase(currentQty, currentAvgCost, qtyInKg, pricePerKg);
      await prisma.stock.update({
        where: { id: stockId },
        data: { quantity: newQuantity, avgCostPerKg: newAvgCost },
      });
    } else {
      const { newQuantity } = calculateStockAfterSale(currentQty, qtyInKg);
      await prisma.stock.update({
        where: { id: stockId },
        data: { quantity: newQuantity },
      });
    }
  }

  // Update the transaction
  const updatedTransaction = await prisma.transaction.update({
    where: { id },
    data: {
      amount: finalAmount,
      type,
      description: finalDescription || null,
      category,
      ledgerType,
      paymentMode: paymentMode || undefined,
      date: date || undefined,
      accountId,
      partyId: partyId || null,
      // Stock fields
      stockId: stockId || null,
      stockMovementType,
      stockQuantity: qtyInKg,
      stockPricePerKg: pricePerKg,
    },
  });

  // Apply the new account balance change
  if (type === "TRANSFER" && updatedTransaction.toAccountId) {
    const { sourceChange, destinationChange } = calculateTransferBalanceChanges(finalAmount);
    await prisma.account.update({
      where: { id: accountId },
      data: { currentBalance: { increment: sourceChange } },
    });
    await prisma.account.update({
      where: { id: updatedTransaction.toAccountId },
      data: { currentBalance: { increment: destinationChange } },
    });
  } else {
    const balanceChange = calculateBalanceChange(type, finalAmount, (paymentMode || "CASH") as PaymentMode);
    if (balanceChange !== 0) {
      await prisma.account.update({
        where: { id: accountId },
        data: { currentBalance: { increment: balanceChange } },
      });
    }
  }

  // NOTE: Party totalDue is now calculated dynamically from transactions
  // No need to update it here

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/parties");
  revalidatePath("/accounts");
  revalidatePath("/stock");

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
  const txPaymentMode = (transaction.paymentMode || "CASH") as PaymentMode;
  const accountId = transaction.accountId;
  const toAccountId = transaction.toAccountId;

  // Reverse the account balance change(s)
  if (type === "TRANSFER" && toAccountId) {
    const { sourceChange, destinationChange } = calculateTransferReversal(amount);
    await prisma.account.update({
      where: { id: accountId },
      data: { currentBalance: { increment: sourceChange } },
    });
    await prisma.account.update({
      where: { id: toAccountId },
      data: { currentBalance: { increment: destinationChange } },
    });
  } else {
    const balanceRevert = calculateBalanceReversal(type, amount, txPaymentMode);
    if (balanceRevert !== 0) {
      await prisma.account.update({
        where: { id: accountId },
        data: { currentBalance: { increment: balanceRevert } },
      });
    }
  }

  // NOTE: Party totalDue is now calculated dynamically from transactions
  // No need to reverse it here - soft-deleted transactions are excluded from calculations

  // Handle stock reversal - check embedded fields first, then legacy stockMovement
  const hasEmbeddedStock = transaction.stockId && transaction.stockQuantity && transaction.stock;
  const hasLegacyStock = transaction.stockMovement && transaction.stockMovement.stock;

  if (hasEmbeddedStock) {
    const stock = transaction.stock!;
    const movementQty = Number(transaction.stockQuantity);
    const movementType = transaction.stockMovementType || "";
    const currentStockQty = Number(stock.quantity);

    const newQuantity = reverseStockChange(currentStockQty, movementQty, movementType);
    await prisma.stock.update({
      where: { id: stock.id },
      data: { quantity: Math.max(0, newQuantity) },
    });
  } else if (hasLegacyStock) {
    const movement = transaction.stockMovement!;
    const stock = movement.stock;
    const movementQty = Number(movement.quantity);
    const currentStockQty = Number(stock.quantity);

    const newQuantity = reverseStockChange(currentStockQty, movementQty, movement.type);
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
