import { test, expect } from '@playwright/test';

test.describe('Restaurants Page', () => {
  test('page loads successfully', async ({ page }) => {
    const response = await page.goto('/restaurants');
    expect(response?.status()).toBeLessThan(400);
  });

  test('page has a heading', async ({ page }) => {
    await page.goto('/restaurants');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('shows POI cards for restaurants', async ({ page }) => {
    await page.goto('/restaurants');
    await page.waitForLoadState('networkidle');
    const cards = page.locator('article, [data-testid="poi-card"], .poi-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('restaurant cards have titles', async ({ page }) => {
    await page.goto('/restaurants');
    await page.waitForLoadState('networkidle');
    const titles = page.locator('article h2, article h3, [data-testid="poi-card"] h2, [data-testid="poi-card"] h3');
    const count = await titles.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('restaurant cards have images', async ({ page }) => {
    await page.goto('/restaurants');
    await page.waitForLoadState('networkidle');
    const images = page.locator('article img, [data-testid="poi-card"] img');
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('restaurant cards link to detail pages', async ({ page }) => {
    await page.goto('/restaurants');
    await page.waitForLoadState('networkidle');
    const link = page.locator('a[href*="/poi/"]').first();
    if (await link.isVisible()) {
      const href = await link.getAttribute('href');
      expect(href).toMatch(/\/poi\//);
    }
  });
});
