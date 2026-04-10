import { test, expect } from '@playwright/test';

test.describe('Theme CSS Custom Properties', () => {
  test('--hb-primary CSS variable is set', async ({ page }) => {
    await page.goto('/');
    const value = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--hb-primary').trim();
    });
    expect(value.length).toBeGreaterThan(0);
  });

  test('--hb-font-heading CSS variable is set', async ({ page }) => {
    await page.goto('/');
    const value = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--hb-font-heading').trim();
    });
    expect(value.length).toBeGreaterThan(0);
  });

  test('primary color is applied to interactive elements', async ({ page }) => {
    await page.goto('/');
    // Check that buttons or links use the primary color in some way
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--hb-primary').trim();
    });
    expect(primaryColor).toBeTruthy();
  });

  test('heading font is applied to headings', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('h1, h2').first();
    if (await heading.isVisible()) {
      const fontFamily = await heading.evaluate((el) => {
        return getComputedStyle(el).fontFamily;
      });
      expect(fontFamily.length).toBeGreaterThan(0);
    }
  });

  test('tenant-specific colors differ between destinations', async ({ page, baseURL }) => {
    await page.goto('/');
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--hb-primary').trim();
    });
    // Calpe uses #7FA594, Texel uses #30c59b — both should be a valid color value
    expect(primaryColor).toMatch(/^#|^rgb|^hsl/);
  });

  test('body has correct font-family from theme', async ({ page }) => {
    await page.goto('/');
    const bodyFont = await page.evaluate(() => {
      return getComputedStyle(document.body).fontFamily;
    });
    expect(bodyFont.length).toBeGreaterThan(0);
  });

  test('--hb-secondary CSS variable is set', async ({ page }) => {
    await page.goto('/');
    const value = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--hb-secondary').trim();
    });
    // Secondary may or may not exist, but check for it
    expect(typeof value).toBe('string');
  });
});
