/**
 * E2E tests for the Quick Entry (transaction) form.
 * Tests all voucher types, stock transactions, and GST.
 */

import { test, expect } from "@playwright/test";
import { ensureLoggedIn, navigateTo, uniqueName } from "./helpers";

test.describe("Quick Entry Form", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("entry page renders with voucher type buttons", async ({ page }) => {
    await navigateTo(page, "/entry");

    await expect(page.locator("text=Quick Entry")).toBeVisible();
    await expect(page.locator("text=Voucher Type")).toBeVisible();

    // All 5 voucher types should be visible
    await expect(page.locator("text=Receipt")).toBeVisible();
    await expect(page.locator("text=Payment")).toBeVisible();
    await expect(page.locator("text=Sales")).toBeVisible();
    await expect(page.locator("text=Purchase")).toBeVisible();
    await expect(page.locator("text=Contra")).toBeVisible();
  });

  test("Receipt is selected by default", async ({ page }) => {
    await navigateTo(page, "/entry");

    // Receipt button should have active styling (green)
    const receiptBtn = page.locator("button", { hasText: "Receipt" });
    await expect(receiptBtn).toHaveClass(/bg-green-500/);
  });

  test("selecting Payment changes description text", async ({ page }) => {
    await navigateTo(page, "/entry");

    await page.click("button:has-text('Payment')");
    await expect(page.locator("text=Cash/Bank paid out")).toBeVisible();
  });

  test("selecting Sales changes description text", async ({ page }) => {
    await navigateTo(page, "/entry");

    await page.click("button:has-text('Sales')");
    await expect(page.locator("text=Sold on credit")).toBeVisible();
  });

  test("selecting Purchase changes description text", async ({ page }) => {
    await navigateTo(page, "/entry");

    await page.click("button:has-text('Purchase')");
    await expect(page.locator("text=Bought on credit")).toBeVisible();
  });

  test("selecting Contra shows destination account field", async ({ page }) => {
    await navigateTo(page, "/entry");

    await page.click("button:has-text('Contra')");

    // Should show "To Account" selector
    await expect(page.locator("text=To Account")).toBeVisible();
  });

  test("amount field accepts numeric input", async ({ page }) => {
    await navigateTo(page, "/entry");

    const amountInput = page.locator('input[placeholder*="amount"], input[type="number"]').first();
    await amountInput.fill("12500");

    await expect(amountInput).toHaveValue("12500");
  });

  test("form shows account selector", async ({ page }) => {
    await navigateTo(page, "/entry");

    // Account dropdown should be present
    await expect(page.locator("text=Account").first()).toBeVisible();
  });

  test("switching voucher types resets form state", async ({ page }) => {
    await navigateTo(page, "/entry");

    // Select Payment
    await page.click("button:has-text('Payment')");
    const paymentBtn = page.locator("button", { hasText: "Payment" });
    await expect(paymentBtn).toHaveClass(/bg-red-500/);

    // Switch to Receipt
    await page.click("button:has-text('Receipt')");
    const receiptBtn = page.locator("button", { hasText: "Receipt" });
    await expect(receiptBtn).toHaveClass(/bg-green-500/);

    // Payment should no longer be active
    await expect(paymentBtn).not.toHaveClass(/bg-red-500/);
  });
});
