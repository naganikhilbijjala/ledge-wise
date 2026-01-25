"use server";

import prisma from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { requireAuth } from "@/lib/auth-utils";
import type {
  NetPosition,
  AccountSummary,
  PartySummary,
  RecentTransaction,
  StockSummary,
  PartyType,
} from "@/lib/types";

// Get net position summary for dashboard
export async function getNetPosition(): Promise<NetPosition> {
  const userId = await requireAuth();

  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true, isDeleted: false },
    select: {
      type: true,
      currentBalance: true,
    },
  });

  let totalCash = 0;
  let totalBank = 0;
  let totalLoansGiven = 0;
  let totalLoansTaken = 0;

  accounts.forEach((account) => {
    const balance = toNumber(account.currentBalance);
    switch (account.type) {
      case "CASH":
        totalCash += balance;
        break;
      case "BANK":
        totalBank += balance;
        break;
      case "LOAN_GIVEN":
        totalLoansGiven += balance;
        break;
      case "LOAN_TAKEN":
        totalLoansTaken += balance;
        break;
    }
  });

  // Net Position = Cash + Bank + Loans Given - Loans Taken
  const netPosition = totalCash + totalBank + totalLoansGiven - totalLoansTaken;

  return {
    totalCash,
    totalBank,
    totalLoansGiven,
    totalLoansTaken,
    netPosition,
  };
}

// Get all accounts with balances
export async function getAccounts(): Promise<AccountSummary[]> {
  const userId = await requireAuth();

  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true, isDeleted: false },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      currentBalance: true,
    },
  });

  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    currentBalance: toNumber(account.currentBalance),
  }));
}

// Get parties with dues
export async function getParties(): Promise<PartySummary[]> {
  const userId = await requireAuth();

  const parties = await prisma.party.findMany({
    where: { userId, isActive: true, isDeleted: false },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      totalDue: true,
    },
  });

  return parties.map((party) => ({
    id: party.id,
    name: party.name,
    type: party.type,
    totalDue: toNumber(party.totalDue),
  }));
}

// Get recent transactions
export async function getRecentTransactions(
  limit: number = 10
): Promise<RecentTransaction[]> {
  const userId = await requireAuth();

  const transactions = await prisma.transaction.findMany({
    where: { userId, isDeleted: false },
    take: limit,
    orderBy: { date: "desc" },
    include: {
      account: {
        select: { name: true },
      },
      party: {
        select: { name: true },
      },
    },
  });

  return transactions.map((tx) => ({
    id: tx.id,
    amount: toNumber(tx.amount),
    type: tx.type,
    date: tx.date,
    description: tx.description,
    category: tx.category,
    ledgerType: tx.ledgerType,
    accountName: tx.account.name,
    partyName: tx.party?.name ?? null,
  }));
}

// Get stock summary with quantity in quintals
export async function getStockSummary(): Promise<StockSummary[]> {
  const userId = await requireAuth();

  const stocks = await prisma.stock.findMany({
    where: { userId, isDeleted: false },
    orderBy: { commodityType: "asc" },
    select: {
      id: true,
      commodityType: true,
      name: true,
      quantity: true,
      unit: true,
      avgCostPerKg: true,
    },
  });

  return stocks.map((stock) => {
    const quantityInKg = toNumber(stock.quantity);
    const avgCostPerKg = toNumber(stock.avgCostPerKg);
    // Convert KG to Quintals (1 Quintal = 100 KG)
    const quantityInQuintals = quantityInKg / 100;
    const totalValue = quantityInKg * avgCostPerKg;
    return {
      id: stock.id,
      commodityType: stock.commodityType,
      name: stock.name,
      quantity: quantityInQuintals,
      unit: "Quintals",
      avgCostPerKg: avgCostPerKg,
      totalValue: totalValue,
    };
  });
}

// Calculate party balance from transactions
// Positive = they owe us (receivable), Negative = we owe them (payable)
// Credit (IN) with party = increases what they owe us
// Debit (OUT) with party = increases what we owe them
async function calculatePartyBalances(userId: string): Promise<Map<string, { id: string; name: string; type: PartyType; balance: number }>> {
  const parties = await prisma.party.findMany({
    where: { userId, isActive: true, isDeleted: false },
    select: {
      id: true,
      name: true,
      type: true,
      transactions: {
        where: { isDeleted: false },
        select: {
          amount: true,
          type: true,
          paymentMode: true,
        },
      },
    },
  });

  const balanceMap = new Map<string, { id: string; name: string; type: PartyType; balance: number }>();

  for (const party of parties) {
    let balance = 0;
    for (const tx of party.transactions) {
      // Only CREDIT transactions affect party balance
      // CASH transactions are settled immediately and don't create outstanding balances
      if (tx.paymentMode !== "CREDIT") continue;

      const amount = toNumber(tx.amount);
      // For CREDIT transactions from party's perspective:
      // OUT (we paid them) = reduces what we owe them → positive balance (they owe us)
      // IN (we received from them) = increases what we owe them → negative balance (we owe them)
      balance += tx.type === "OUT" ? amount : -amount;
    }
    balanceMap.set(party.id, {
      id: party.id,
      name: party.name,
      type: party.type as PartyType,
      balance,
    });
  }

  return balanceMap;
}

// Get parties who owe money (receivables) - calculated from transactions
export async function getReceivables(): Promise<PartySummary[]> {
  const userId = await requireAuth();
  const balances = await calculatePartyBalances(userId);

  const receivables: PartySummary[] = [];
  for (const party of balances.values()) {
    if (party.balance > 0) {
      receivables.push({
        id: party.id,
        name: party.name,
        type: party.type,
        totalDue: party.balance,
      });
    }
  }

  // Sort by amount descending
  return receivables.sort((a, b) => b.totalDue - a.totalDue);
}

// Get parties we owe money to (payables) - calculated from transactions
export async function getPayables(): Promise<PartySummary[]> {
  const userId = await requireAuth();
  const balances = await calculatePartyBalances(userId);

  const payables: PartySummary[] = [];
  for (const party of balances.values()) {
    if (party.balance < 0) {
      payables.push({
        id: party.id,
        name: party.name,
        type: party.type,
        totalDue: Math.abs(party.balance),
      });
    }
  }

  // Sort by amount descending
  return payables.sort((a, b) => b.totalDue - a.totalDue);
}

// Get dashboard stats
export async function getDashboardStats() {
  const [
    accounts,
    receivables,
    payables,
    stockSummary,
  ] = await Promise.all([
    getAccounts(),
    getReceivables(),
    getPayables(),
    getStockSummary(),
  ]);

  const totalReceivables = receivables.reduce((sum, p) => sum + p.totalDue, 0);
  const totalPayables = payables.reduce((sum, p) => sum + p.totalDue, 0);
  const totalStockValue = stockSummary.reduce((sum, s) => sum + s.totalValue, 0);
  const totalStockQuantity = stockSummary.reduce((sum, s) => sum + s.quantity, 0);

  return {
    accounts,
    receivables,
    payables,
    stockSummary,
    totals: {
      totalReceivables,
      totalPayables,
      totalStockValue,
      totalStockQuantity,
    },
  };
}
