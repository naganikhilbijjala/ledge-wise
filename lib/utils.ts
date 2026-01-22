import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency in Indian Rupees
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format number in Indian numbering system (lakhs, crores)
export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}

// Format date in Indian format
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

// Format date for input fields
export function formatDateForInput(date: Date): string {
  return new Date(date).toISOString().split("T")[0];
}

// Short format for mobile
export function formatINRShort(amount: number): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (absAmount >= 10000000) {
    return `${sign}₹${(absAmount / 10000000).toFixed(2)}Cr`;
  } else if (absAmount >= 100000) {
    return `${sign}₹${(absAmount / 100000).toFixed(2)}L`;
  } else if (absAmount >= 1000) {
    return `${sign}₹${(absAmount / 1000).toFixed(1)}K`;
  }
  return `${sign}₹${absAmount.toFixed(0)}`;
}

// Get color class based on amount (positive = green, negative = red)
export function getAmountColor(amount: number): string {
  if (amount > 0) return "text-green-600";
  if (amount < 0) return "text-red-600";
  return "text-gray-600";
}

// Get background color class based on account type
export function getAccountTypeColor(type: string): string {
  switch (type) {
    case "CASH":
      return "bg-green-100 text-green-800";
    case "BANK":
      return "bg-blue-100 text-blue-800";
    case "LOAN_GIVEN":
      return "bg-amber-100 text-amber-800";
    case "LOAN_TAKEN":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// Get account type display label (using business terminology)
export function getAccountTypeLabel(type: string): string {
  switch (type) {
    case "CASH":
      return "Cash";
    case "BANK":
      return "Bank";
    case "LOAN_GIVEN":
      return "Debtors"; // People who owe us money
    case "LOAN_TAKEN":
      return "Creditors"; // People we owe money to
    default:
      return type;
  }
}

// Get party type display name
export function getPartyTypeLabel(type: string): string {
  switch (type) {
    case "CUSTOMER":
      return "Customer (Seller)";
    case "VENDOR":
      return "Vendor (Buyer)";
    case "LENDER":
      return "Lender";
    case "BORROWER":
      return "Borrower";
    default:
      return type;
  }
}

// Convert Decimal to number (Prisma returns Decimal type)
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}
