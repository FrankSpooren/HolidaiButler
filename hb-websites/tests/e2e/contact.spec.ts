import { test, expect } from '@playwright/test';

test.describe('Contact Page', () => {
  test('page loads successfully', async ({ page }) => {
    const response = await page.goto('/contact');
    expect(response?.status()).toBeLessThan(400);
  });

  test('page has a heading', async ({ page }) => {
    await page.goto('/contact');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('contact form is visible', async ({ page }) => {
    await page.goto('/contact');
    const form = page.locator('form, [data-testid="contact-form"]');
    await expect(form.first()).toBeVisible({ timeout: 10000 });
  });

  test('form has required input fields', async ({ page }) => {
    await page.goto('/contact');
    // Look for typical contact form fields
    const nameField = page.locator('input[name="name"], input[type="text"], input[placeholder*="name" i], input[placeholder*="naam" i]').first();
    const emailField = page.locator('input[name="email"], input[type="email"]').first();
    await expect(nameField).toBeVisible();
    await expect(emailField).toBeVisible();
  });

  test('form has a message textarea', async ({ page }) => {
    await page.goto('/contact');
    const textarea = page.locator('textarea, [data-testid="message-field"]');
    await expect(textarea.first()).toBeVisible();
  });

  test('form has a submit button', async ({ page }) => {
    await page.goto('/contact');
    const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("send"), button:has-text("verzend"), button:has-text("submit")');
    await expect(submitBtn.first()).toBeVisible();
  });
});
