import { describe, it, expect } from "vitest";
import {
  calculateGst,
  calculateBalanceChange,
  calculateTransferBalanceChanges,
  calculateBalanceReversal,
  calculateTransferReversal,
  calculateStockAfterPurchase,
  calculateStockAfterSale,
  convertToKg,
  convertPriceToPerKg,
  getStockMovementType,
  reverseStockChange,
  BUSINESS_STATE,
} from "@/lib/calculations";

// ─── GST Calculations ───────────────────────────────────────────────

describe("calculateGst", () => {
  it("calculates intra-state GST (CGST + SGST) for same state", () => {
    const result = calculateGst(10000, "Telangana", BUSINESS_STATE, true);

    expect(result.isSameState).toBe(true);
    expect(result.isInterState).toBe(false);
    expect(result.cgstAmount).toBe(250); // 2.5%
    expect(result.sgstAmount).toBe(250); // 2.5%
    expect(result.igstAmount).toBe(0);
    expect(result.totalGstAmount).toBe(500); // 5%
    expect(result.finalAmount).toBe(10500);
  });

  it("calculates inter-state GST (IGST) for different state", () => {
    const result = calculateGst(10000, "Maharashtra", BUSINESS_STATE, true);

    expect(result.isSameState).toBe(false);
    expect(result.isInterState).toBe(true);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
    expect(result.igstAmount).toBe(500); // 5%
    expect(result.totalGstAmount).toBe(500);
    expect(result.finalAmount).toBe(10500);
  });

  it("returns zero GST when includeTax is false", () => {
    const result = calculateGst(10000, "Telangana", BUSINESS_STATE, false);

    expect(result.totalGstAmount).toBe(0);
    expect(result.finalAmount).toBe(10000);
  });

  it("returns zero GST when partyState is null", () => {
    const result = calculateGst(10000, null, BUSINESS_STATE, true);

    expect(result.totalGstAmount).toBe(0);
    expect(result.finalAmount).toBe(10000);
  });

  it("handles rounding correctly for odd amounts", () => {
    // 999 * 0.025 = 24.975 → should round to 24.98
    const result = calculateGst(999, "Telangana", BUSINESS_STATE, true);

    expect(result.cgstAmount).toBe(24.98);
    expect(result.sgstAmount).toBe(24.98);
    expect(result.totalGstAmount).toBe(49.96);
    expect(result.finalAmount).toBe(1048.96);
  });

  it("handles small amounts", () => {
    const result = calculateGst(1, "Maharashtra", BUSINESS_STATE, true);

    expect(result.igstAmount).toBe(0.05);
    expect(result.finalAmount).toBe(1.05);
  });

  it("handles zero amount", () => {
    const result = calculateGst(0, "Telangana", BUSINESS_STATE, true);

    expect(result.totalGstAmount).toBe(0);
    expect(result.finalAmount).toBe(0);
  });
});

// ─── Balance Change Calculations ────────────────────────────────────

describe("calculateBalanceChange", () => {
  it("returns positive for CASH IN (receipt)", () => {
    expect(calculateBalanceChange("IN", 5000, "CASH")).toBe(5000);
  });

  it("returns negative for CASH OUT (payment)", () => {
    expect(calculateBalanceChange("OUT", 5000, "CASH")).toBe(-5000);
  });

  it("returns zero for CREDIT IN (credit sale - no money moves)", () => {
    expect(calculateBalanceChange("IN", 5000, "CREDIT")).toBe(0);
  });

  it("returns zero for CREDIT OUT (credit purchase - no money moves)", () => {
    expect(calculateBalanceChange("OUT", 5000, "CREDIT")).toBe(0);
  });
});

describe("calculateTransferBalanceChanges", () => {
  it("source decreases and destination increases by same amount", () => {
    const result = calculateTransferBalanceChanges(3000);

    expect(result.sourceChange).toBe(-3000);
    expect(result.destinationChange).toBe(3000);
  });

  it("changes sum to zero (no money created or destroyed)", () => {
    const result = calculateTransferBalanceChanges(7500);

    expect(result.sourceChange + result.destinationChange).toBe(0);
  });
});

// ─── Balance Reversal ───────────────────────────────────────────────

describe("calculateBalanceReversal", () => {
  it("reversal of IN/CASH is negative (undo the increment)", () => {
    expect(calculateBalanceReversal("IN", 5000, "CASH")).toBe(-5000);
  });

  it("reversal of OUT/CASH is positive (undo the decrement)", () => {
    expect(calculateBalanceReversal("OUT", 5000, "CASH")).toBe(5000);
  });

  it("reversal of CREDIT transaction is zero (nothing to undo)", () => {
    expect(calculateBalanceReversal("IN", 5000, "CREDIT")).toBe(0);
    expect(calculateBalanceReversal("OUT", 5000, "CREDIT")).toBe(0);
  });

  it("reversal exactly cancels the original change", () => {
    const original = calculateBalanceChange("IN", 3000, "CASH");
    const reversal = calculateBalanceReversal("IN", 3000, "CASH");
    expect(original + reversal).toBe(0);
  });

  it("reversal of OUT exactly cancels", () => {
    const original = calculateBalanceChange("OUT", 3000, "CASH");
    const reversal = calculateBalanceReversal("OUT", 3000, "CASH");
    expect(original + reversal).toBe(0);
  });
});

describe("calculateTransferReversal", () => {
  it("source gets money back, destination loses it", () => {
    const result = calculateTransferReversal(3000);

    expect(result.sourceChange).toBe(3000);
    expect(result.destinationChange).toBe(-3000);
  });

  it("reversal exactly cancels the original transfer", () => {
    const original = calculateTransferBalanceChanges(5000);
    const reversal = calculateTransferReversal(5000);

    expect(original.sourceChange + reversal.sourceChange).toBe(0);
    expect(original.destinationChange + reversal.destinationChange).toBe(0);
  });
});

// ─── Stock Calculations ─────────────────────────────────────────────

describe("convertToKg", () => {
  it("converts quintals to kg", () => {
    expect(convertToKg(2, "QUINTAL")).toBe(200);
  });

  it("keeps kg as-is", () => {
    expect(convertToKg(50, "KG")).toBe(50);
  });

  it("handles fractional quintals", () => {
    expect(convertToKg(1.5, "QUINTAL")).toBe(150);
  });
});

describe("convertPriceToPerKg", () => {
  it("converts price per quintal to price per kg", () => {
    expect(convertPriceToPerKg(10000, "QUINTAL")).toBe(100);
  });

  it("keeps price per kg as-is", () => {
    expect(convertPriceToPerKg(100, "KG")).toBe(100);
  });
});

describe("getStockMovementType", () => {
  it("OUT transaction = PURCHASE (buying stock)", () => {
    expect(getStockMovementType("OUT")).toBe("PURCHASE");
  });

  it("IN transaction = SALE (selling stock)", () => {
    expect(getStockMovementType("IN")).toBe("SALE");
  });
});

describe("calculateStockAfterPurchase", () => {
  it("calculates weighted average cost on first purchase", () => {
    const result = calculateStockAfterPurchase(0, 0, 100, 50);

    expect(result.newQuantity).toBe(100);
    expect(result.newAvgCost).toBe(50);
  });

  it("calculates weighted average cost on subsequent purchase", () => {
    // Existing: 100kg @ 50/kg = 5000 total value
    // New purchase: 100kg @ 60/kg = 6000 total value
    // New avg: 11000 / 200 = 55
    const result = calculateStockAfterPurchase(100, 50, 100, 60);

    expect(result.newQuantity).toBe(200);
    expect(result.newAvgCost).toBe(55);
  });

  it("handles purchase with different quantities", () => {
    // Existing: 200kg @ 40/kg = 8000
    // New: 50kg @ 80/kg = 4000
    // New avg: 12000 / 250 = 48
    const result = calculateStockAfterPurchase(200, 40, 50, 80);

    expect(result.newQuantity).toBe(250);
    expect(result.newAvgCost).toBe(48);
  });

  it("handles purchase when current stock is zero", () => {
    const result = calculateStockAfterPurchase(0, 0, 500, 120);

    expect(result.newQuantity).toBe(500);
    expect(result.newAvgCost).toBe(120);
  });
});

describe("calculateStockAfterSale", () => {
  it("decreases quantity", () => {
    const result = calculateStockAfterSale(500, 200);
    expect(result.newQuantity).toBe(300);
  });

  it("does not go below zero", () => {
    const result = calculateStockAfterSale(100, 200);
    expect(result.newQuantity).toBe(0);
  });

  it("selling all stock results in zero", () => {
    const result = calculateStockAfterSale(500, 500);
    expect(result.newQuantity).toBe(0);
  });
});

describe("reverseStockChange", () => {
  it("reverses a PURCHASE (subtract the purchased qty)", () => {
    // After purchase: 500kg. Original purchase was 200kg. Reversal: 500 - 200 = 300
    expect(reverseStockChange(500, 200, "PURCHASE")).toBe(300);
  });

  it("reverses a SALE (add back the sold qty)", () => {
    // After sale: 300kg. Original sale was 200kg. Reversal: 300 + 200 = 500
    expect(reverseStockChange(300, 200, "SALE")).toBe(500);
  });

  it("reverses PROCESSING same as SALE", () => {
    expect(reverseStockChange(300, 100, "PROCESSING")).toBe(400);
  });

  it("reverses ADJUSTMENT (subtract the adjustment)", () => {
    expect(reverseStockChange(500, 100, "ADJUSTMENT")).toBe(400);
  });

  it("returns current qty for unknown movement type", () => {
    expect(reverseStockChange(500, 100, "UNKNOWN")).toBe(500);
  });
});

// ─── Full Scenario Tests (combining functions) ─────────────────────

describe("full transaction scenarios", () => {
  it("contra transfer: total money in system stays constant", () => {
    const cashBefore = 10000;
    const bankBefore = 5000;
    const transferAmount = 3000;

    const { sourceChange, destinationChange } = calculateTransferBalanceChanges(transferAmount);
    const cashAfter = cashBefore + sourceChange;
    const bankAfter = bankBefore + destinationChange;

    expect(cashAfter).toBe(7000);
    expect(bankAfter).toBe(8000);
    expect(cashBefore + bankBefore).toBe(cashAfter + bankAfter); // conservation
  });

  it("credit sale does not affect account, creates party receivable", () => {
    const accountBefore = 10000;
    const change = calculateBalanceChange("IN", 5000, "CREDIT");
    expect(accountBefore + change).toBe(10000); // unchanged
  });

  it("stock purchase + sale cycle: quantity matches", () => {
    // Start with 0 stock
    const afterPurchase = calculateStockAfterPurchase(0, 0, 500, 100);
    expect(afterPurchase.newQuantity).toBe(500);

    // Sell 200
    const afterSale = calculateStockAfterSale(afterPurchase.newQuantity, 200);
    expect(afterSale.newQuantity).toBe(300);

    // Delete the sale (reverse)
    const afterReverse = reverseStockChange(afterSale.newQuantity, 200, "SALE");
    expect(afterReverse).toBe(500); // back to post-purchase
  });

  it("create + delete cycle: account balance returns to original", () => {
    const originalBalance = 10000;

    // Create a CASH IN transaction
    const createChange = calculateBalanceChange("IN", 3000, "CASH");
    const afterCreate = originalBalance + createChange;
    expect(afterCreate).toBe(13000);

    // Delete it (reverse)
    const deleteChange = calculateBalanceReversal("IN", 3000, "CASH");
    const afterDelete = afterCreate + deleteChange;
    expect(afterDelete).toBe(originalBalance);
  });

  it("GST: intra-state and inter-state produce same total tax", () => {
    const amount = 10000;
    const intra = calculateGst(amount, "Telangana", BUSINESS_STATE, true);
    const inter = calculateGst(amount, "Maharashtra", BUSINESS_STATE, true);

    expect(intra.totalGstAmount).toBe(inter.totalGstAmount);
    expect(intra.finalAmount).toBe(inter.finalAmount);
  });
});
