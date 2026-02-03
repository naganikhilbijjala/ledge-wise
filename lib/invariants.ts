/**
 * Runtime invariant checks for financial data integrity.
 * These catch logic errors early — they throw in development
 * and log warnings in production.
 */

const IS_DEV = process.env.NODE_ENV !== "production";

function invariantViolation(message: string) {
  if (IS_DEV) {
    throw new Error(`INVARIANT VIOLATION: ${message}`);
  } else {
    console.error(`INVARIANT VIOLATION: ${message}`);
  }
}

/**
 * Assert that debit and credit totals match (double-entry accounting).
 * Tolerance of 0.01 for floating point rounding.
 */
export function assertBalancesMatch(
  debitTotal: number,
  creditTotal: number,
  context?: string
) {
  if (Math.abs(debitTotal - creditTotal) > 0.01) {
    invariantViolation(
      `Ledger imbalance${context ? ` (${context})` : ""}: ` +
      `Debit=${debitTotal}, Credit=${creditTotal}, Diff=${Math.abs(debitTotal - creditTotal)}`
    );
  }
}

/**
 * Assert that a stock quantity is not negative.
 */
export function assertNonNegativeStock(quantity: number, stockName?: string) {
  if (quantity < 0) {
    invariantViolation(
      `Negative stock quantity${stockName ? ` for "${stockName}"` : ""}: ${quantity}`
    );
  }
}

/**
 * Assert that a transfer doesn't create or destroy money.
 * The sum of source change + destination change should be zero.
 */
export function assertTransferConservation(
  sourceChange: number,
  destinationChange: number,
  context?: string
) {
  const sum = sourceChange + destinationChange;
  if (Math.abs(sum) > 0.01) {
    invariantViolation(
      `Transfer conservation violated${context ? ` (${context})` : ""}: ` +
      `Source=${sourceChange}, Destination=${destinationChange}, Sum=${sum}`
    );
  }
}

/**
 * Assert that an account balance change is zero for CREDIT transactions.
 */
export function assertCreditNoBalanceChange(
  paymentMode: string,
  balanceChange: number,
  context?: string
) {
  if (paymentMode === "CREDIT" && Math.abs(balanceChange) > 0.01) {
    invariantViolation(
      `CREDIT transaction modified account balance${context ? ` (${context})` : ""}: ` +
      `balanceChange=${balanceChange}`
    );
  }
}
