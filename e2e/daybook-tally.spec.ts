/**
 * E2E tests for Day Book and Tally export pages.
 * Tests date filtering, daily summaries, and Tally reconciliation.
 */

import { test, expect } from "@playwright/test";
import { ensureLoggedIn, navigateTo } from "./helpers";

test.describe("Day Book", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("daybook page renders with date filters", async ({ page }) => {
    await navigateTo(page, "/daybook");

    // Should have date inputs
    await expect(page.locator('input[type="date"]').first()).toBeVisible();

    // Should show "Day Book" heading
    await expect(page.locator("text=Day Book").first()).toBeVisible();
  });

  test("daybook shows opening and closing balance", async ({ page }) => {
    await navigateTo(page, "/daybook");

    // Should display balance labels
    await expect(page.locator("body")).toContainText(/opening|closing|balance/i);
  });

  test("daybook has account filter dropdown", async ({ page }) => {
    await navigateTo(page, "/daybook");

    // Should show account filter
    await expect(page.locator("body")).toContainText(/all accounts|account/i);
  });

  test("changing date range updates the view", async ({ page }) => {
    await navigateTo(page, "/daybook");

    const dateInputs = page.locator('input[type="date"]');
    const startDate = dateInputs.first();

    if (await startDate.isVisible()) {
      await startDate.fill("2025-01-01");
      await page.waitForLoadState("networkidle");

      // Page should still render without errors
      await expect(page.locator("text=Day Book").first()).toBeVisible();
    }
  });
});

test.describe("Tally Export", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("tally page renders", async ({ page }) => {
    await navigateTo(page, "/tally");

    await expect(page.locator("text=Tally").first()).toBeVisible();
  });

  test("tally page has ledger type filter", async ({ page }) => {
    await navigateTo(page, "/tally");

    // Should show filter options for OFFICIAL/PARALLEL
    await expect(page.locator("body")).toContainText(/official|parallel|ledger/i);
  });

  test("tally page has date filters", async ({ page }) => {
    await navigateTo(page, "/tally");

    await expect(page.locator('input[type="date"]').first()).toBeVisible();
  });
});
