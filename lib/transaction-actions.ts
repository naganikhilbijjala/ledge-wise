"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-utils";
import type { LedgerType, TransactionType } from "@/lib/types";

interface CreateTransactionInput {
  accountId: string;
  amount: number;
  type: TransactionType;
  partyId?: string;
  description?: string;
  category?: string;
  ledgerType: LedgerType;
}

export async function createTransaction(input: CreateTransactionInput) {
  const userId = await requireAuth();
  const { accountId, amount, type, partyId, description, category, ledgerType } =
    input;

  // Verify account ownership
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId, isDeleted: false },
  });
  if (!account) {
    throw new Error("Account not found");
  }

  // Verify party ownership if provided
  if (partyId) {
    const party = await prisma.party.findFirst({
      where: { id: partyId, userId, isDeleted: false },
    });
    if (!party) {
      throw new Error("Party not found");
    }
  }

  // Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      amount,
      type,
      description,
      category,
      ledgerType,
      accountId,
      partyId: partyId || null,
      userId,
    },
  });

  // Update account balance
  const balanceChange = type === "IN" ? amount : -amount;
  await prisma.account.update({
    where: { id: accountId },
    data: {
      currentBalance: {
        increment: balanceChange,
      },
    },
  });

  // Update party due if applicable
  // totalDue convention: Positive = they owe us (receivable), Negative = we owe them (payable)
  //
  // For turmeric business:
  // - Money IN from party = they paid us for goods we sold = REDUCE their receivable (they owe less)
  // - Money OUT to party = we paid them for goods we bought = REDUCE our payable (we owe less)
  //
  // The due change should move totalDue TOWARD ZERO:
  // - Money IN: if totalDue > 0, decrease it (they owed us, now they owe less)
  // - Money OUT: if totalDue < 0, increase it toward 0 (we owed them, now we owe less)
  if (partyId) {
    // Money IN reduces receivables (positive dues) - we receive payment
    // Money OUT reduces payables (negative dues) - we make payment
    const dueChange = type === "IN" ? -amount : amount;
    await prisma.party.update({
      where: { id: partyId },
      data: {
        totalDue: {
          increment: dueChange,
        },
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/parties");
  revalidatePath("/accounts");

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
    },
  });

  if (!transaction) {
    return null;
  }

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
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  const amount = Number(transaction.amount);
  const type = transaction.type as TransactionType;
  const accountId = transaction.accountId;
  const partyId = transaction.partyId;

  // Reverse the account balance change
  const balanceRevert = type === "IN" ? -amount : amount;
  await prisma.account.update({
    where: { id: accountId },
    data: {
      currentBalance: {
        increment: balanceRevert,
      },
    },
  });

  // Reverse the party due change if applicable
  if (partyId) {
    const dueRevert = type === "IN" ? amount : -amount;
    await prisma.party.update({
      where: { id: partyId },
      data: {
        totalDue: {
          increment: dueRevert,
        },
      },
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

  return { success: true };
}
