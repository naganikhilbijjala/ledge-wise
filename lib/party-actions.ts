"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { PartyType } from "@/lib/types";

interface CreatePartyInput {
  name: string;
  type: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export async function createParty(input: CreatePartyInput) {
  const party = await prisma.party.create({
    data: {
      name: input.name,
      type: input.type as PartyType,
      phone: input.phone || null,
      address: input.address || null,
      notes: input.notes || null,
    },
  });

  revalidatePath("/parties");
  revalidatePath("/entry");
  revalidatePath("/");

  return party;
}

export async function updatePartyDue(partyId: string, amount: number) {
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
