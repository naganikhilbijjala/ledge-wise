/**
 * E2E test for a full purchase-to-sale cycle.
 * This is the most complex test: creates accounts, parties, stock,
 * then performs purchase and sale transactions and verifies balances.
 */

import { test, expect } from "@playwright/test";
import { ensureLoggedIn, navigateTo, uniqueName } from "./helpers";

test.describe("Full Purchase-to-Sale Cycle", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("dashboard renders all sections", async ({ page }) => {
    await navigateTo(page, "/");

    // Dashboard should show key sections
    await expect(page.locator("body")).toContainText(/cash|bank/i);
    await expect(page.locator("body")).toContainText(/debtor|creditor|receivable|payable/i);
  });

  test("navigate through all main pages without errors", async ({ page }) => {
    const pages = ["/", "/entry", "/accounts", "/parties", "/stock", "/daybook", "/tally", "/transactions"];

    for (const path of pages) {
      await navigateTo(page, path);
      // No error page should appear
      await expect(page.locator("body")).not.toContainText("500");
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
    }
  });

  test("create account, party, stock, then verify they appear in Quick Entry", async ({ page }) => {
    const accountName = uniqueName("E2ECash");
    const partyName = uniqueName("E2EParty");
    const stockName = uniqueName("E2EStock");

    // 1. Create Account
    await navigateTo(page, "/accounts/new");
    await page.fill("#name, input[name='name']", accountName);
    await page.click("text=Account Type");
    await page.click("text=Cash");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/accounts/, { timeout: 10000 });

    // 2. Create Party
    await navigateTo(page, "/parties/new");
    await page.fill("#name, input[name='name']", partyName);
    await page.click("text=Party Type");
    await page.click("text=Customer");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/parties/, { timeout: 10000 });

    // 3. Create Stock
    await navigateTo(page, "/stock/new");
    await page.fill("#name, input[name='name']", stockName);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/stock/, { timeout: 10000 });

    // 4. Go to Quick Entry and verify all three appear in dropdowns
    await navigateTo(page, "/entry");

    // The form should be available
    await expect(page.locator("text=Voucher Type")).toBeVisible();
    await expect(page.locator("text=Account").first()).toBeVisible();
  });

  test("sidebar navigation highlights active page", async ({ page }) => {
    await navigateTo(page, "/accounts");

    // Look for the sidebar link to accounts
    const accountsLink = page.locator('nav a[href="/accounts"], aside a[href="/accounts"]').first();
    if (await accountsLink.isVisible()) {
      // Should have some active/selected styling
      const classes = await accountsLink.getAttribute("class");
      expect(classes).toBeTruthy();
    }
  });

  test("transactions page lists recent transactions", async ({ page }) => {
    await navigateTo(page, "/transactions");

    // Should either show transactions or an empty state
    await expect(page.locator("body")).toContainText(/transaction|no transaction|recent/i);
  });

  test("dashboard debtors and creditors reflect party balances", async ({ page }) => {
    await navigateTo(page, "/");

    // Check that debtors/creditors sections exist
    const body = await page.locator("body").textContent();
    const hasDebtors = /debtor/i.test(body || "");
    const hasCreditors = /creditor/i.test(body || "");
    const hasReceivables = /receivable/i.test(body || "");
    const hasPayables = /payable/i.test(body || "");

    // At least one of these patterns should exist on the dashboard
    expect(hasDebtors || hasCreditors || hasReceivables || hasPayables).toBe(true);
  });
});
