"use server";

import prisma from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { requireAuth } from "@/lib/auth-utils";
import type { TransactionType, LedgerType, AccountType } from "@/lib/types";

// Types for day book
export interface DayBookTransaction {
  id: string;
  amount: number;
  type: TransactionType;
  date: Date;
  description: string | null;
  category: string | null;
  ledgerType: LedgerType;
  accountId: string;
  accountName: string;
  partyName: string | null;
  receiptNumber: string | null;
}

export interface DailySummary {
  date: string; // ISO date string (YYYY-MM-DD)
  displayDate: string;
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  netChange: number;
  closingBalance: number;
  transactions: DayBookTransaction[];
  transactionCount: number;
}

export interface DayBookData {
  accountId: string | null;
  accountName: string;
  accountType: AccountType | null;
  startDate: string;
  endDate: string;
  overallOpeningBalance: number;
  overallClosingBalance: number;
  totalIn: number;
  totalOut: number;
  dailySummaries: DailySummary[];
}

// Get the opening balance for an account (or all accounts) before a given date
async function getOpeningBalance(
  userId: string,
  accountId: string | null,
  beforeDate: Date
): Promise<number> {
  // Sum all transactions before the given date
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      isDeleted: false,
      date: { lt: beforeDate },
      ...(accountId ? { accountId } : {}),
    },
    select: {
      amount: true,
      type: true,
    },
  });

  let balance = 0;
  for (const tx of transactions) {
    const amount = toNumber(tx.amount);
    if (tx.type === "IN") {
      balance += amount;
    } else {
      balance -= amount;
    }
  }

  return balance;
}

// Helper to get local date string (YYYY-MM-DD) from a Date object
function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get day book data for a date range
export async function getDayBookData(
  accountId: string | null,
  startDate: string,
  endDate: string
): Promise<DayBookData> {
  const userId = await requireAuth();

  // Parse dates - create Date objects from the YYYY-MM-DD strings
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T23:59:59.999");

  // Get account details if specific account is selected
  let accountName = "All Accounts";
  let accountType: AccountType | null = null;

  if (accountId) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { name: true, type: true },
    });
    if (account) {
      accountName = account.name;
      accountType = account.type as AccountType;
    }
  }

  // Get opening balance
  const overallOpeningBalance = await getOpeningBalance(userId, accountId, start);

  // Fetch all transactions in the date range
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      isDeleted: false,
      date: { gte: start, lte: end },
      ...(accountId ? { accountId } : {}),
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      account: { select: { name: true } },
      party: { select: { name: true } },
    },
  });

  // Group transactions by date (using local date to handle timezone correctly)
  const transactionsByDate = new Map<string, DayBookTransaction[]>();
  let totalIn = 0;
  let totalOut = 0;

  for (const tx of transactions) {
    // Use local date key to group transactions correctly
    const dateKey = getLocalDateKey(new Date(tx.date));
    const amount = toNumber(tx.amount);

    const dayBookTx: DayBookTransaction = {
      id: tx.id,
      amount,
      type: tx.type as TransactionType,
      date: tx.date,
      description: tx.description,
      category: tx.category,
      ledgerType: tx.ledgerType as LedgerType,
      accountId: tx.accountId,
      accountName: tx.account.name,
      partyName: tx.party?.name ?? null,
      receiptNumber: tx.receiptNumber,
    };

    if (!transactionsByDate.has(dateKey)) {
      transactionsByDate.set(dateKey, []);
    }
    transactionsByDate.get(dateKey)!.push(dayBookTx);

    if (tx.type === "IN") {
      totalIn += amount;
    } else {
      totalOut += amount;
    }
  }

  // Build daily summaries
  const dailySummaries: DailySummary[] = [];
  let runningBalance = overallOpeningBalance;

  // Get all dates in the range (using local date keys)
  const currentDate = new Date(startDate + "T00:00:00");
  const endDateObj = new Date(endDate + "T00:00:00");

  while (currentDate <= endDateObj) {
    const dateKey = getLocalDateKey(currentDate);
    const dayTransactions = transactionsByDate.get(dateKey) || [];

    const openingBalance = runningBalance;
    let dayIn = 0;
    let dayOut = 0;

    for (const tx of dayTransactions) {
      if (tx.type === "IN") {
        dayIn += tx.amount;
      } else {
        dayOut += tx.amount;
      }
    }

    const netChange = dayIn - dayOut;
    const closingBalance = openingBalance + netChange;
    runningBalance = closingBalance;

    // Only include days with transactions or if it's the first/last day
    if (dayTransactions.length > 0) {
      dailySummaries.push({
        date: dateKey,
        displayDate: formatDisplayDate(currentDate),
        openingBalance,
        totalIn: dayIn,
        totalOut: dayOut,
        netChange,
        closingBalance,
        transactions: dayTransactions,
        transactionCount: dayTransactions.length,
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    accountId,
    accountName,
    accountType,
    startDate,
    endDate,
    overallOpeningBalance,
    overallClosingBalance: runningBalance,
    totalIn,
    totalOut,
    dailySummaries,
  };
}

// Format date for display
function formatDisplayDate(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Get accounts list for the filter dropdown
export async function getDayBookAccounts() {
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
    type: account.type as AccountType,
    currentBalance: toNumber(account.currentBalance),
  }));
}
