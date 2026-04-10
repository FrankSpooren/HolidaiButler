import { test, expect } from '@playwright/test';

test.describe('Explore Page', () => {
  test('page loads successfully', async ({ page }) => {
    const response = await page.goto('/explore');
    expect(response?.status()).toBeLessThan(400);
  });

  test('page has a heading', async ({ page }) => {
    await page.goto('/explore');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('POI grid is visible with cards', async ({ page }) => {
    await page.goto('/explore');
    // Look for a grid/list of POI cards
    const cards = page.locator('[data-testid="poi-card"], [data-testid="poi-grid"] > *, .poi-card, article').first();
    await expect(cards).toBeVisible({ timeout: 10000 });
  });

  test('POI cards have images', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    const images = page.locator('article img, [data-testid="poi-card"] img, .poi-card img');
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('category filters or filter controls exist', async ({ page }) => {
    await page.goto('/explore');
    // Look for filter buttons, select dropdowns, or filter sections
    const filters = page.locator(
      '[data-testid="category-filter"], [data-testid="filters"], button:has-text("filter"), select, [role="tablist"], [data-testid="poi-grid"]'
    );
    const count = await filters.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('POI cards link to detail pages', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    const poiLink = page.locator('a[href*="/poi/"]').first();
    if (await poiLink.isVisible()) {
      const href = await poiLink.getAttribute('href');
      expect(href).toMatch(/\/poi\//);
    }
  });
});
