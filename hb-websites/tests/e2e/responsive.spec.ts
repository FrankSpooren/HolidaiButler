import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('mobile viewport shows hamburger menu button', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    // Look for a hamburger/menu toggle button
    const menuButton = page.locator(
      'button[aria-label*="menu" i], button[aria-label*="navigation" i], [data-testid="mobile-menu-toggle"], [data-testid="hamburger"], button.hamburger, button.menu-toggle'
    );
    await expect(menuButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('mobile hamburger opens mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const menuButton = page.locator(
      'button[aria-label*="menu" i], button[aria-label*="navigation" i], [data-testid="mobile-menu-toggle"], [data-testid="hamburger"], button.hamburger, button.menu-toggle'
    ).first();
    await menuButton.click();
    // After opening, nav links should be visible
    const mobileNav = page.locator('nav a[href]');
    const count = await mobileNav.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('desktop viewport shows full navigation links', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    const links = nav.locator('a[href]');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('desktop viewport hides hamburger menu button', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const menuButton = page.locator(
      'button[aria-label*="menu" i], [data-testid="mobile-menu-toggle"], [data-testid="hamburger"]'
    );
    const count = await menuButton.count();
    if (count > 0) {
      await expect(menuButton.first()).toBeHidden();
    }
  });

  test('content does not overflow horizontally on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    // Allow small tolerance (scrollbar, etc.)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test('images are responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const images = page.locator('main img');
    const count = await images.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const box = await images.nth(i).boundingBox();
      if (box) {
        // Images should not be wider than the viewport
        expect(box.width).toBeLessThanOrEqual(380);
      }
    }
  });
});
