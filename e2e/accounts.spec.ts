/**
 * E2E tests for account, party, and stock management pages.
 * Tests creating, viewing, and navigating between entities.
 */

import { test, expect } from "@playwright/test";
import { ensureLoggedIn, navigateTo, uniqueName } from "./helpers";

test.describe("Account Management", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("accounts page renders", async ({ page }) => {
    await navigateTo(page, "/accounts");
    await expect(page.locator("h1, h2").filter({ hasText: /accounts/i }).first()).toBeVisible();
  });

  test("create new account page renders form", async ({ page }) => {
    await navigateTo(page, "/accounts/new");

    await expect(page.locator("#name, input[name='name']").first()).toBeVisible();
    await expect(page.locator("text=Account Type").first()).toBeVisible();
  });

  test("create a CASH account", async ({ page }) => {
    const name = uniqueName("Cash");
    await navigateTo(page, "/accounts/new");

    await page.fill("#name, input[name='name']", name);
    // Select CASH type
    await page.click("text=Account Type");
    await page.click("text=Cash");

    await page.click('button[type="submit"]');

    // Should redirect to accounts list
    await page.waitForURL(/\/accounts/, { timeout: 10000 });

    // Account should appear in the list
    await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5000 });
  });

  test("clicking an account navigates to ledger", async ({ page }) => {
    await navigateTo(page, "/accounts");

    // Click the first account card/link
    const firstAccount = page.locator("a[href*='/accounts/']").first();
    if (await firstAccount.isVisible()) {
      await firstAccount.click();
      await page.waitForURL(/\/accounts\/[^/]+$/, { timeout: 10000 });

      // Ledger page should show transaction table or empty state
      await expect(page.locator("body")).toContainText(/ledger|transactions|no transactions/i);
    }
  });
});

test.describe("Party Management", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("parties page renders", async ({ page }) => {
    await navigateTo(page, "/parties");
    await expect(page.locator("h1, h2").filter({ hasText: /parties/i }).first()).toBeVisible();
  });

  test("create new party page renders form", async ({ page }) => {
    await navigateTo(page, "/parties/new");

    await expect(page.locator("#name, input[name='name']").first()).toBeVisible();
    await expect(page.locator("text=Party Type").first()).toBeVisible();
  });

  test("create a CUSTOMER party", async ({ page }) => {
    const name = uniqueName("Customer");
    await navigateTo(page, "/parties/new");

    await page.fill("#name, input[name='name']", name);
    await page.click("text=Party Type");
    await page.click("text=Customer");

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/parties/, { timeout: 10000 });

    await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5000 });
  });

  test("clicking a party navigates to khata (ledger)", async ({ page }) => {
    await navigateTo(page, "/parties");

    const firstParty = page.locator("a[href*='/parties/']").first();
    if (await firstParty.isVisible()) {
      await firstParty.click();
      await page.waitForURL(/\/parties\/[^/]+$/, { timeout: 10000 });

      await expect(page.locator("body")).toContainText(/ledger|khata|transactions|no transactions/i);
    }
  });
});

test.describe("Stock Management", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("stock page renders", async ({ page }) => {
    await navigateTo(page, "/stock");
    await expect(page.locator("h1, h2").filter({ hasText: /stock|inventory/i }).first()).toBeVisible();
  });

  test("create new stock page renders form", async ({ page }) => {
    await navigateTo(page, "/stock/new");

    await expect(page.locator("#name, input[name='name']").first()).toBeVisible();
  });

  test("create a stock item", async ({ page }) => {
    const name = uniqueName("Turmeric");
    await navigateTo(page, "/stock/new");

    await page.fill("#name, input[name='name']", name);

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/stock/, { timeout: 10000 });

    await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5000 });
  });

  test("clicking a stock item navigates to detail page", async ({ page }) => {
    await navigateTo(page, "/stock");

    const firstStock = page.locator("a[href*='/stock/']").first();
    if (await firstStock.isVisible()) {
      await firstStock.click();
      await page.waitForURL(/\/stock\/[^/]+$/, { timeout: 10000 });

      // Detail page should show quantity and cost info
      await expect(page.locator("body")).toContainText(/quantity|cost|value/i);
    }
  });
});
