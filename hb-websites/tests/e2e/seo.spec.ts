import { test, expect } from '@playwright/test';

test.describe('SEO Meta Tags', () => {
  test('page has a title tag', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('page has meta description', async ({ page }) => {
    await page.goto('/');
    const description = page.locator('meta[name="description"]');
    const content = await description.getAttribute('content');
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(10);
  });

  test('page has og:title meta tag', async ({ page }) => {
    await page.goto('/');
    const ogTitle = page.locator('meta[property="og:title"]');
    const content = await ogTitle.getAttribute('content');
    expect(content).toBeTruthy();
  });

  test('page has og:description meta tag', async ({ page }) => {
    await page.goto('/');
    const ogDesc = page.locator('meta[property="og:description"]');
    const content = await ogDesc.getAttribute('content');
    expect(content).toBeTruthy();
  });

  test('page has canonical URL', async ({ page }) => {
    await page.goto('/');
    const canonical = page.locator('link[rel="canonical"]');
    const href = await canonical.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toMatch(/^https?:\/\//);
  });

  test('page has robots meta tag or no noindex', async ({ page }) => {
    await page.goto('/');
    const robots = page.locator('meta[name="robots"]');
    const count = await robots.count();
    if (count > 0) {
      const content = await robots.getAttribute('content');
      // Should not be noindex on the homepage
      expect(content).not.toMatch(/noindex/);
    }
    // If no robots meta, that is also acceptable (defaults to index)
  });

  test('page has og:type meta tag', async ({ page }) => {
    await page.goto('/');
    const ogType = page.locator('meta[property="og:type"]');
    const content = await ogType.getAttribute('content');
    expect(content).toBeTruthy();
  });

  test('page has charset meta tag', async ({ page }) => {
    await page.goto('/');
    const charset = page.locator('meta[charset], meta[http-equiv="Content-Type"]');
    const count = await charset.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('page has viewport meta tag', async ({ page }) => {
    await page.goto('/');
    const viewport = page.locator('meta[name="viewport"]');
    const content = await viewport.getAttribute('content');
    expect(content).toBeTruthy();
    expect(content).toContain('width=');
  });
});
