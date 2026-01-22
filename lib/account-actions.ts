"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-utils";
import type { AccountType } from "@/lib/types";

interface CreateAccountInput {
  name: string;
  type: string;
  description?: string;
  currentBalance?: number;
}

export async function createAccount(input: CreateAccountInput) {
  const userId = await requireAuth();

  const account = await prisma.account.create({
    data: {
      name: input.name,
      type: input.type as AccountType,
      description: input.description || null,
      currentBalance: input.currentBalance || 0,
      userId,
    },
  });

  revalidatePath("/accounts");
  revalidatePath("/entry");
  revalidatePath("/");

  return account;
}

export async function getAccountById(id: string) {
  const userId = await requireAuth();

  const account = await prisma.account.findFirst({
    where: {
      id,
      userId,
      isDeleted: false,
    },
  });

  if (!account) {
    return null;
  }

  return {
    id: account.id,
    name: account.name,
    type: account.type as AccountType,
    description: account.description,
    currentBalance: Number(account.currentBalance),
    isActive: account.isActive,
  };
}

interface UpdateAccountInput {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export async function updateAccount(input: UpdateAccountInput) {
  const userId = await requireAuth();

  // Verify ownership
  const existing = await prisma.account.findFirst({
    where: { id: input.id, userId, isDeleted: false },
  });

  if (!existing) {
    throw new Error("Account not found");
  }

  const account = await prisma.account.update({
    where: { id: input.id },
    data: {
      name: input.name,
      type: input.type as AccountType,
      description: input.description || null,
    },
  });

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${input.id}`);
  revalidatePath("/entry");
  revalidatePath("/");

  return account;
}

export async function deleteAccount(id: string) {
  const userId = await requireAuth();

  // Verify ownership
  const existing = await prisma.account.findFirst({
    where: { id, userId, isDeleted: false },
  });

  if (!existing) {
    throw new Error("Account not found");
  }

  // Check if account has transactions
  const transactionCount = await prisma.transaction.count({
    where: { accountId: id, isDeleted: false },
  });

  if (transactionCount > 0) {
    throw new Error(
      "Cannot delete account with transactions. Delete or reassign transactions first."
    );
  }

  // Soft delete
  await prisma.account.update({
    where: { id },
    data: { isDeleted: true, isActive: false },
  });

  revalidatePath("/accounts");
  revalidatePath("/entry");
  revalidatePath("/");

  return { success: true };
}

export async function updateAccountBalance(accountId: string, amount: number) {
  const userId = await requireAuth();

  // Verify ownership
  const existing = await prisma.account.findFirst({
    where: { id: accountId, userId, isDeleted: false },
  });

  if (!existing) {
    throw new Error("Account not found");
  }

  await prisma.account.update({
    where: { id: accountId },
    data: {
      currentBalance: {
        increment: amount,
      },
    },
  });

  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function getAccountsForUser() {
  const userId = await requireAuth();

  const accounts = await prisma.account.findMany({
    where: { userId, isDeleted: false, isActive: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type as AccountType,
    currentBalance: Number(account.currentBalance),
    description: account.description,
  }));
}
