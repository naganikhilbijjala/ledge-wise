"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { AccountType } from "@/lib/types";

interface CreateAccountInput {
  name: string;
  type: string;
  description?: string;
  currentBalance?: number;
}

export async function createAccount(input: CreateAccountInput) {
  const account = await prisma.account.create({
    data: {
      name: input.name,
      type: input.type as AccountType,
      description: input.description || null,
      currentBalance: input.currentBalance || 0,
    },
  });

  revalidatePath("/accounts");
  revalidatePath("/entry");
  revalidatePath("/");

  return account;
}

export async function updateAccountBalance(accountId: string, amount: number) {
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
