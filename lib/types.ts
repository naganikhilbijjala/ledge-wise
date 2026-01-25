// Type definitions for LedgeWise

export type AccountType = "CASH" | "BANK" | "LOAN_GIVEN" | "LOAN_TAKEN";
export type TransactionType = "IN" | "OUT" | "TRANSFER";
export type PartyType = "CUSTOMER" | "VENDOR" | "LENDER" | "BORROWER";
export type LedgerType = "OFFICIAL" | "PARALLEL";
export type CommodityType = "TURMERIC_RAW" | "TURMERIC_POWDER" | "MAIZE" | "OTHER";
export type StockMovementType = "PURCHASE" | "PROCESSING" | "SALE" | "ADJUSTMENT";

// Dashboard summary types
export interface NetPosition {
  totalCash: number;
  totalBank: number;
  totalLoansGiven: number;
  totalLoansTaken: number;
  netPosition: number;
}

export interface AccountSummary {
  id: string;
  name: string;
  type: AccountType;
  currentBalance: number;
}

export interface PartySummary {
  id: string;
  name: string;
  type: PartyType;
  totalDue: number;
}

export interface RecentTransaction {
  id: string;
  amount: number;
  type: TransactionType;
  date: Date;
  description: string | null;
  category: string | null;
  ledgerType: LedgerType;
  accountName: string;
  partyName: string | null;
}

export interface StockSummary {
  id: string;
  commodityType: CommodityType;
  name: string;
  quantity: number;
  unit: string;
  avgCostPerKg: number;
  totalValue: number;
}

// Form types
export interface QuickEntryForm {
  accountId: string;
  amount: number;
  type: TransactionType;
  partyId?: string;
  description?: string;
  category?: string;
  ledgerType: LedgerType;
}

// Filter for official records (Tally export)
export interface TransactionFilter {
  startDate?: Date;
  endDate?: Date;
  ledgerType?: LedgerType;
  accountId?: string;
  partyId?: string;
  category?: string;
  isReconciled?: boolean;
}
