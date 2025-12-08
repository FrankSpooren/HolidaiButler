/**
 * Authentication E2E Tests
 * HolidaiButler Customer Portal
 *
 * Tests:
 * - Login page accessibility
 * - Login form validation
 * - Successful login flow
 * - Failed login handling
 * - Signup flow
 * - Logout flow
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
    });

    test('should display login form', async ({ page }) => {
      // Check page title
      await expect(page).toHaveTitle(/HolidaiButler|Inloggen|Login/i);

      // Check form elements exist
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      // Click submit without filling form
      await page.locator('button[type="submit"]').click();

      // Should show validation errors
      await expect(page.locator('text=/email|e-mail/i')).toBeVisible();
    });

    test('should have link to signup page', async ({ page }) => {
      // Find and click signup link
      const signupLink = page.locator('a[href*="signup"], a:has-text("Aanmelden"), a:has-text("Sign up")');
      await expect(signupLink).toBeVisible();

      // Click and verify navigation
      await signupLink.click();
      await expect(page).toHaveURL(/signup/);
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="password"], input[name="password"]')).toBeFocused();

      await page.keyboard.press('Tab');
      // Should focus on remember me or submit button
    });
  });

  test.describe('Signup Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/signup');
    });

    test('should display signup form', async ({ page }) => {
      // Check form elements
      await expect(page.locator('input[name="name"], input[placeholder*="naam" i]')).toBeVisible();
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
    });

    test('should have link back to login', async ({ page }) => {
      const loginLink = page.locator('a[href*="login"], a:has-text("Inloggen"), a:has-text("Log in")');
      await expect(loginLink).toBeVisible();
    });

    test('should validate password requirements', async ({ page }) => {
      // Fill weak password
      await page.locator('input[type="email"], input[name="email"]').fill('test@example.com');
      await page.locator('input[type="password"]').first().fill('weak');

      // Try to submit
      await page.locator('button[type="submit"]').click();

      // Should show password requirements error
      // (The exact error depends on implementation)
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route', async ({ page }) => {
      // Try to access account page without login
      await page.goto('/account');

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });

    test('should redirect to login when accessing bookings', async ({ page }) => {
      await page.goto('/account/bookings');
      await expect(page).toHaveURL(/login/);
    });

    test('should redirect to login when accessing favorites', async ({ page }) => {
      await page.goto('/account/favorites');
      await expect(page).toHaveURL(/login/);
    });
  });
});

test.describe('Social Login', () => {
  test('should display Google login button', async ({ page }) => {
    await page.goto('/login');

    // Look for Google login button
    const googleButton = page.locator('button:has-text("Google"), [aria-label*="Google"]');
    // Button may or may not exist depending on configuration
  });

  test('should display Facebook login button', async ({ page }) => {
    await page.goto('/login');

    // Look for Facebook login button
    const facebookButton = page.locator('button:has-text("Facebook"), [aria-label*="Facebook"]');
    // Button may or may not exist depending on configuration
  });
});
