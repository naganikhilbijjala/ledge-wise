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

// Get stock summary
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
    const quantity = toNumber(stock.quantity);
    const avgCost = toNumber(stock.avgCostPerKg);
    return {
      id: stock.id,
      commodityType: stock.commodityType,
      name: stock.name,
      quantity,
      unit: stock.unit,
      avgCostPerKg: avgCost,
      totalValue: quantity * avgCost,
    };
  });
}

// Get parties who owe money (receivables)
export async function getReceivables(): Promise<PartySummary[]> {
  const userId = await requireAuth();

  const parties = await prisma.party.findMany({
    where: {
      userId,
      isActive: true,
      isDeleted: false,
      totalDue: { gt: 0 },
    },
    orderBy: { totalDue: "desc" },
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

// Get parties we owe money to (payables)
export async function getPayables(): Promise<PartySummary[]> {
  const userId = await requireAuth();

  const parties = await prisma.party.findMany({
    where: {
      userId,
      isActive: true,
      isDeleted: false,
      totalDue: { lt: 0 },
    },
    orderBy: { totalDue: "asc" },
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
    totalDue: Math.abs(toNumber(party.totalDue)),
  }));
}

// Get dashboard stats
export async function getDashboardStats() {
  const [
    netPosition,
    accounts,
    receivables,
    payables,
    recentTransactions,
    stockSummary,
  ] = await Promise.all([
    getNetPosition(),
    getAccounts(),
    getReceivables(),
    getPayables(),
    getRecentTransactions(5),
    getStockSummary(),
  ]);

  const totalReceivables = receivables.reduce((sum, p) => sum + p.totalDue, 0);
  const totalPayables = payables.reduce((sum, p) => sum + p.totalDue, 0);
  const totalStockValue = stockSummary.reduce((sum, s) => sum + s.totalValue, 0);

  return {
    netPosition,
    accounts,
    receivables,
    payables,
    recentTransactions,
    stockSummary,
    totals: {
      totalReceivables,
      totalPayables,
      totalStockValue,
    },
  };
}
