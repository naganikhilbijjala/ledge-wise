/**
 * E2E test helpers for Playwright tests.
 * Provides login, navigation, and common form interactions.
 */

import { type Page, expect } from "@playwright/test";

// Test credentials - create this user manually or via seed
export const TEST_USER = {
  name: "Test User",
  username: "e2e_testuser",
  password: "testpass123",
};

/**
 * Sign up a new test user. Skips if user already exists.
 */
export async function signUp(page: Page) {
  await page.goto("/signup");
  await page.fill("#name", TEST_USER.name);
  await page.fill("#username", TEST_USER.username);
  await page.fill("#password", TEST_USER.password);
  await page.fill("#confirmPassword", TEST_USER.password);
  await page.click('button[type="submit"]');

  // Either redirects to login (success) or shows error (user exists)
  await page.waitForURL(/\/(login|signup)/, { timeout: 10000 });
}

/**
 * Log in with test credentials. Assumes user exists.
 */
export async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#username", TEST_USER.username);
  await page.fill("#password", TEST_USER.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL("/", { timeout: 10000 });
}

/**
 * Ensure we're logged in (sign up if needed, then login).
 */
export async function ensureLoggedIn(page: Page) {
  await page.goto("/");

  // Check if we're redirected to login
  if (page.url().includes("/login")) {
    // Try login first
    await page.fill("#username", TEST_USER.username);
    await page.fill("#password", TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait briefly
    await page.waitForTimeout(2000);

    // If still on login, need to sign up first
    if (page.url().includes("/login")) {
      await signUp(page);
      await login(page);
    }
  }

  // Should be on dashboard now
  await expect(page).toHaveURL("/");
}

/**
 * Navigate to a page using the sidebar.
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/**
 * Wait for toast/notification to appear and disappear.
 */
export async function waitForNavigation(page: Page) {
  await page.waitForLoadState("networkidle");
}

/**
 * Generate a unique name to avoid collisions between test runs.
 */
export function uniqueName(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}
