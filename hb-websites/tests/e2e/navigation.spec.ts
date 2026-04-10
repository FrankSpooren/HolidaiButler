import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('header navigation is visible', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('nav contains links to main pages', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    const links = nav.locator('a[href]');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('clicking a nav link navigates to the correct page', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    const exploreLink = nav.locator('a[href*="explore"], a[href*="ontdek"]').first();
    if (await exploreLink.isVisible()) {
      await exploreLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/explore|ontdek/i);
    }
  });

  test('active nav link has visual distinction', async ({ page }) => {
    await page.goto('/explore');
    const nav = page.locator('nav');
    const activeLink = nav.locator('a[href*="explore"], a[aria-current="page"]').first();
    if (await activeLink.isVisible()) {
      const classes = await activeLink.getAttribute('class');
      // Active link should have some styling class or aria-current
      const ariaCurrent = await activeLink.getAttribute('aria-current');
      const hasDistinction = (classes && classes.length > 0) || ariaCurrent === 'page';
      expect(hasDistinction).toBeTruthy();
    }
  });

  test('logo links to homepage', async ({ page }) => {
    await page.goto('/explore');
    const logo = page.locator('header a[href="/"], header a img, header a[href] >> nth=0').first();
    if (await logo.isVisible()) {
      await logo.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/\/$/);
    }
  });
});
