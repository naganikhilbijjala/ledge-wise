"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-utils";
import type { PartyType } from "@/lib/types";

interface CreatePartyInput {
  name: string;
  type: string;
  phone?: string;
  address?: string;
  state?: string;
  gstNumber?: string;
  notes?: string;
}

export async function createParty(input: CreatePartyInput) {
  const userId = await requireAuth();

  const party = await prisma.party.create({
    data: {
      name: input.name,
      type: input.type as PartyType,
      phone: input.phone || null,
      address: input.address || null,
      state: input.state || null,
      gstNumber: input.gstNumber || null,
      notes: input.notes || null,
      userId,
    },
  });

  revalidatePath("/parties");
  revalidatePath("/entry");
  revalidatePath("/");

  return party;
}

export async function getPartyById(id: string) {
  const userId = await requireAuth();

  const party = await prisma.party.findFirst({
    where: {
      id,
      userId,
      isDeleted: false,
    },
  });

  if (!party) {
    return null;
  }

  return {
    id: party.id,
    name: party.name,
    type: party.type as PartyType,
    phone: party.phone,
    address: party.address,
    state: party.state,
    gstNumber: party.gstNumber,
    notes: party.notes,
    totalDue: Number(party.totalDue),
    isActive: party.isActive,
  };
}

interface UpdatePartyInput {
  id: string;
  name: string;
  type: string;
  phone?: string;
  address?: string;
  state?: string;
  gstNumber?: string;
  notes?: string;
}

export async function updateParty(input: UpdatePartyInput) {
  const userId = await requireAuth();

  // Verify ownership
  const existing = await prisma.party.findFirst({
    where: { id: input.id, userId, isDeleted: false },
  });

  if (!existing) {
    throw new Error("Party not found");
  }

  const party = await prisma.party.update({
    where: { id: input.id },
    data: {
      name: input.name,
      type: input.type as PartyType,
      phone: input.phone || null,
      address: input.address || null,
      state: input.state || null,
      gstNumber: input.gstNumber || null,
      notes: input.notes || null,
    },
  });

  revalidatePath("/parties");
  revalidatePath(`/parties/${input.id}`);
  revalidatePath("/entry");
  revalidatePath("/");

  return party;
}

export async function deleteParty(id: string) {
  const userId = await requireAuth();

  // Verify ownership
  const existing = await prisma.party.findFirst({
    where: { id, userId, isDeleted: false },
  });

  if (!existing) {
    throw new Error("Party not found");
  }

  // Check if party has transactions
  const transactionCount = await prisma.transaction.count({
    where: { partyId: id, isDeleted: false },
  });

  if (transactionCount > 0) {
    throw new Error(
      "Cannot delete party with transactions. Delete transactions first or mark party as inactive."
    );
  }

  // Soft delete
  await prisma.party.update({
    where: { id },
    data: { isDeleted: true, isActive: false },
  });

  revalidatePath("/parties");
  revalidatePath("/entry");
  revalidatePath("/");

  return { success: true };
}

export async function updatePartyDue(partyId: string, amount: number) {
  const userId = await requireAuth();

  // Verify ownership
  const existing = await prisma.party.findFirst({
    where: { id: partyId, userId, isDeleted: false },
  });

  if (!existing) {
    throw new Error("Party not found");
  }

  await prisma.party.update({
    where: { id: partyId },
    data: {
      totalDue: {
        increment: amount,
      },
    },
  });

  revalidatePath("/parties");
  revalidatePath(`/parties/${partyId}`);
}

export async function getPartiesForUser() {
  const userId = await requireAuth();

  const parties = await prisma.party.findMany({
    where: { userId, isDeleted: false, isActive: true },
    orderBy: { name: "asc" },
  });

  return parties.map((party) => ({
    id: party.id,
    name: party.name,
    type: party.type as PartyType,
    phone: party.phone,
    address: party.address,
    state: party.state,
    gstNumber: party.gstNumber,
    totalDue: Number(party.totalDue),
  }));
}

interface AdjustPartyBalanceInput {
  partyId: string;
  newBalance: number; // Positive = they owe us, Negative = we owe them
  reason?: string;
}

export async function adjustPartyBalance(input: AdjustPartyBalanceInput) {
  const userId = await requireAuth();
  const { partyId, newBalance, reason } = input;

  // Verify ownership
  const party = await prisma.party.findFirst({
    where: { id: partyId, userId, isDeleted: false },
    include: {
      transactions: {
        where: { isDeleted: false, paymentMode: "CREDIT" },
        select: { amount: true, type: true },
      },
    },
  });

  if (!party) {
    throw new Error("Party not found");
  }

  // Calculate current balance from CREDIT transactions
  let currentBalance = 0;
  for (const tx of party.transactions) {
    const amount = Number(tx.amount);
    // IN (Credit) = We sold on credit → they owe us more → +amount
    // OUT (Debit) = We bought on credit → we owe them more → -amount
    currentBalance += tx.type === "IN" ? amount : -amount;
  }

  const difference = newBalance - currentBalance;
  if (difference === 0) {
    return { success: true, message: "No adjustment needed" };
  }

  // Get the first active account for the adjustment transaction
  const account = await prisma.account.findFirst({
    where: { userId, isActive: true, isDeleted: false },
    orderBy: { type: "asc" }, // Prefer CASH account
  });

  if (!account) {
    throw new Error("No active account found for adjustment");
  }

  // Create adjustment transaction as CREDIT so it affects party balance
  // If difference is positive (they owe us more) → need IN transaction (credit sale)
  // If difference is negative (we owe them more) → need OUT transaction (credit purchase)
  const transactionType = difference > 0 ? "IN" : "OUT";
  const adjustmentAmount = Math.abs(difference);

  await prisma.transaction.create({
    data: {
      amount: adjustmentAmount,
      type: transactionType,
      description: reason || "Balance adjustment",
      category: "ADJUSTMENT",
      ledgerType: "PARALLEL",
      paymentMode: "CREDIT",
      date: new Date(),
      accountId: account.id,
      partyId: partyId,
      userId,
    },
  });

  revalidatePath("/parties");
  revalidatePath(`/parties/${partyId}`);
  revalidatePath("/");

  return { success: true };
}
