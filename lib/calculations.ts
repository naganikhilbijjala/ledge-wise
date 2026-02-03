/**
 * Pure calculation functions for LedgeWise financial logic.
 * No database access — these are safe to unit test.
 */

import type { TransactionType, PaymentMode } from "@/lib/types";

// GST Constants
export const BUSINESS_STATE = "Telangana";
export const GST_RATE = 0.05; // 5% total
export const CGST_RATE = 0.025; // 2.5% (intra-state)
export const SGST_RATE = 0.025; // 2.5% (intra-state)
export const IGST_RATE = 0.05; // 5% (inter-state)

// --- GST Calculations ---

export interface GstResult {
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGstAmount: number;
  finalAmount: number;
  isSameState: boolean;
  isInterState: boolean;
}

export function calculateGst(
  amount: number,
  partyState: string | null,
  businessState: string,
  includeTax: boolean
): GstResult {
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalGstAmount = 0;
  const isSameState = partyState === businessState;
  const isInterState = !!partyState && partyState !== businessState;

  if (includeTax && partyState) {
    if (isSameState) {
      cgstAmount = Math.round(amount * CGST_RATE * 100) / 100;
      sgstAmount = Math.round(amount * SGST_RATE * 100) / 100;
      totalGstAmount = cgstAmount + sgstAmount;
    } else if (isInterState) {
      igstAmount = Math.round(amount * IGST_RATE * 100) / 100;
      totalGstAmount = igstAmount;
    }
  }

  return {
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalGstAmount,
    finalAmount: amount + totalGstAmount,
    isSameState,
    isInterState,
  };
}

// --- Balance Change Calculations ---

/**
 * Calculate how much an account balance should change for a non-TRANSFER transaction.
 * Returns 0 for CREDIT transactions (no money moves).
 */
export function calculateBalanceChange(
  type: TransactionType,
  amount: number,
  paymentMode: PaymentMode
): number {
  if (paymentMode === "CREDIT") return 0;
  return type === "IN" ? amount : -amount;
}

/**
 * Calculate balance changes for a TRANSFER (Contra) transaction.
 */
export function calculateTransferBalanceChanges(amount: number): {
  sourceChange: number;
  destinationChange: number;
} {
  return {
    sourceChange: -amount,
    destinationChange: amount,
  };
}

// --- Balance Reversal (for update/delete) ---

/**
 * Calculate how to reverse an account balance change.
 * Returns 0 for CREDIT transactions (nothing was changed).
 */
export function calculateBalanceReversal(
  type: TransactionType,
  amount: number,
  paymentMode: PaymentMode
): number {
  if (paymentMode === "CREDIT") return 0;
  // Reverse: IN was +amount, so reversal is -amount. OUT was -amount, so reversal is +amount.
  return type === "IN" ? -amount : amount;
}

/**
 * Calculate how to reverse a TRANSFER's balance changes.
 */
export function calculateTransferReversal(amount: number): {
  sourceChange: number;
  destinationChange: number;
} {
  return {
    sourceChange: amount, // give money back to source
    destinationChange: -amount, // take money back from destination
  };
}

// --- Stock Calculations ---

export function convertToKg(
  quantity: number,
  unit: "KG" | "QUINTAL"
): number {
  return unit === "QUINTAL" ? quantity * 100 : quantity;
}

export function convertPriceToPerKg(
  price: number,
  unit: "KG" | "QUINTAL"
): number {
  return unit === "QUINTAL" ? price / 100 : price;
}

/**
 * Calculate new stock state after a purchase.
 * Uses weighted average cost method.
 */
export function calculateStockAfterPurchase(
  currentQty: number,
  currentAvgCost: number,
  purchaseQtyKg: number,
  purchasePricePerKg: number
): { newQuantity: number; newAvgCost: number } {
  const totalCurrentValue = currentQty * currentAvgCost;
  const newValue = purchaseQtyKg * purchasePricePerKg;
  const newQuantity = currentQty + purchaseQtyKg;
  const newAvgCost =
    newQuantity > 0
      ? (totalCurrentValue + newValue) / newQuantity
      : purchasePricePerKg;

  return { newQuantity, newAvgCost };
}

/**
 * Calculate new stock state after a sale.
 * Average cost does not change on sales.
 */
export function calculateStockAfterSale(
  currentQty: number,
  saleQtyKg: number
): { newQuantity: number } {
  return { newQuantity: Math.max(0, currentQty - saleQtyKg) };
}

/**
 * Determine stock movement type from transaction type.
 * OUT (Payment/Purchase) = buying stock = PURCHASE
 * IN (Receipt/Sales) = selling stock = SALE
 */
export function getStockMovementType(
  transactionType: TransactionType
): "PURCHASE" | "SALE" {
  return transactionType === "OUT" ? "PURCHASE" : "SALE";
}

/**
 * Reverse a stock quantity change (for update/delete).
 */
export function reverseStockChange(
  currentQty: number,
  movementQty: number,
  movementType: string
): number {
  if (movementType === "PURCHASE") {
    return currentQty - movementQty;
  } else if (movementType === "SALE" || movementType === "PROCESSING") {
    return currentQty + movementQty;
  } else if (movementType === "ADJUSTMENT") {
    return currentQty - movementQty;
  }
  return currentQty;
}
