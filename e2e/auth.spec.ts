/**
 * E2E tests for authentication flows.
 * Tests signup, login, logout, and session persistence.
 */

import { test, expect } from "@playwright/test";
import { TEST_USER, uniqueName } from "./helpers";

test.describe("Authentication", () => {
  test("signup page renders correctly", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.locator("text=Create Account")).toBeVisible();
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("text=LedgeWise")).toBeVisible();
    await expect(page.locator("#username")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("text=Sign In")).toBeVisible();
  });

  test("signup with mismatched passwords shows error", async ({ page }) => {
    await page.goto("/signup");

    await page.fill("#name", "Test");
    await page.fill("#username", "mismatch_user");
    await page.fill("#password", "password123");
    await page.fill("#confirmPassword", "differentpass");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Passwords do not match")).toBeVisible();
  });

  test("signup with short password shows error", async ({ page }) => {
    await page.goto("/signup");

    await page.fill("#name", "Test");
    await page.fill("#username", "short_pass");
    await page.fill("#password", "12345");
    await page.fill("#confirmPassword", "12345");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Password must be at least 6 characters")).toBeVisible();
  });

  test("login with wrong credentials shows error", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#username", "nonexistent_user_xyz");
    await page.fill("#password", "wrongpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Invalid username or password")).toBeVisible({ timeout: 5000 });
  });

  test("successful signup redirects to login with success message", async ({ page }) => {
    const username = uniqueName("signup");

    await page.goto("/signup");
    await page.fill("#name", "E2E Signup Test");
    await page.fill("#username", username);
    await page.fill("#password", "testpass123");
    await page.fill("#confirmPassword", "testpass123");
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page.locator("text=Account created successfully")).toBeVisible();
  });

  test("successful login redirects to dashboard", async ({ page }) => {
    // First create user
    const username = uniqueName("login");
    await page.goto("/signup");
    await page.fill("#name", "E2E Login Test");
    await page.fill("#username", username);
    await page.fill("#password", "testpass123");
    await page.fill("#confirmPassword", "testpass123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/login/, { timeout: 10000 });

    // Now login
    await page.fill("#username", username);
    await page.fill("#password", "testpass123");
    await page.click('button[type="submit"]');

    await page.waitForURL("/", { timeout: 10000 });
    await expect(page).toHaveURL("/");
  });

  test("unauthenticated access redirects to login", async ({ page }) => {
    // Clear cookies to ensure no session
    await page.context().clearCookies();

    await page.goto("/entry");
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  test("login page has link to signup", async ({ page }) => {
    await page.goto("/login");

    const signupLink = page.locator('a[href="/signup"]');
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toHaveText("Sign up");
  });

  test("signup page has link to login", async ({ page }) => {
    await page.goto("/signup");

    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveText("Sign in");
  });
});
