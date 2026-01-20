"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
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
  const { accountId, amount, type, partyId, description, category, ledgerType } =
    input;

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
  if (partyId) {
    // If money comes IN from a party, they owe us less (decrease due)
    // If money goes OUT to a party, they owe us more (increase due) or we paid them
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
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
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
  const parties = await prisma.party.findMany({
    where: { isActive: true },
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
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });
  return categories;
}
