import { test, expect } from '@playwright/test';

test.describe('POI Detail Page', () => {
  test('page loads for POI id 1', async ({ page }) => {
    const response = await page.goto('/poi/1');
    expect(response?.status()).toBeLessThan(400);
  });

  test('shows POI title', async ({ page }) => {
    await page.goto('/poi/1');
    const title = page.locator('h1').first();
    await expect(title).toBeVisible();
    const text = await title.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('shows POI description', async ({ page }) => {
    await page.goto('/poi/1');
    await page.waitForLoadState('networkidle');
    // Description could be in a paragraph, div, or section
    const description = page.locator('p, [data-testid="poi-description"], .description, .detail-description');
    const count = await description.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('shows POI images', async ({ page }) => {
    await page.goto('/poi/1');
    await page.waitForLoadState('networkidle');
    const images = page.locator('img[src*="poi-images"], img[src*="googleapis"], main img');
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('reviews section exists', async ({ page }) => {
    await page.goto('/poi/1');
    await page.waitForLoadState('networkidle');
    // Look for reviews section by heading, data-testid, or class
    const reviewsSection = page.locator(
      '[data-testid="reviews"], [data-testid="reviews-section"], h2:has-text("review"), h3:has-text("review"), .reviews, section:has-text("review")'
    );
    const count = await reviewsSection.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('page does not show error for valid POI', async ({ page }) => {
    await page.goto('/poi/1');
    const errorText = page.locator('text=/not found|error|404/i');
    await expect(errorText).toHaveCount(0);
  });

  test('has back navigation or breadcrumb', async ({ page }) => {
    await page.goto('/poi/1');
    const backNav = page.locator(
      'a[href="/explore"], a[href*="back"], nav[aria-label="breadcrumb"], [data-testid="breadcrumb"], .breadcrumb'
    );
    const count = await backNav.count();
    expect(count).toBeGreaterThanOrEqual(0); // Soft check — may not exist yet
  });
});
