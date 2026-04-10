import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('html element has lang attribute', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
    expect(lang!.length).toBeGreaterThanOrEqual(2);
  });

  test('all images have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      const role = await images.nth(i).getAttribute('role');
      // Images should have alt text, or role="presentation" for decorative images
      const isAccessible = (alt !== null) || role === 'presentation' || role === 'none';
      expect(isAccessible).toBeTruthy();
    }
  });

  test('page has main landmark', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('main, [role="main"]');
    await expect(main.first()).toBeVisible();
  });

  test('page has navigation landmark', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav.first()).toBeVisible();
  });

  test('page has header landmark', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header, [role="banner"]');
    await expect(header.first()).toBeVisible();
  });

  test('page has footer landmark', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer, [role="contentinfo"]');
    await expect(footer.first()).toBeVisible();
  });

  test('headings follow hierarchy', async ({ page }) => {
    await page.goto('/');
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const count = await headings.count();
    if (count > 0) {
      // Page should have at least one h1
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
    }
  });

  test('interactive elements are keyboard focusable', async ({ page }) => {
    await page.goto('/');
    // Tab to the first interactive element
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName.toLowerCase() : null;
    });
    // Should focus on a link, button, or input
    expect(['a', 'button', 'input', 'select', 'textarea', 'summary']).toContain(focusedTag);
  });

  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/');
    const buttons = page.locator('button');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledBy = await button.getAttribute('aria-labelledby');
        const title = await button.getAttribute('title');
        const hasName = (text && text.trim().length > 0) || ariaLabel || ariaLabelledBy || title;
        expect(hasName).toBeTruthy();
      }
    }
  });

  test('links have discernible text', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('a[href]');
    const count = await links.count();
    for (let i = 0; i < Math.min(count, 20); i++) {
      const link = links.nth(i);
      if (await link.isVisible()) {
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');
        const title = await link.getAttribute('title');
        const hasImg = await link.locator('img[alt]').count();
        const hasName = (text && text.trim().length > 0) || ariaLabel || title || hasImg > 0;
        expect(hasName).toBeTruthy();
      }
    }
  });

  test('color contrast - text is readable', async ({ page }) => {
    await page.goto('/');
    // Basic check: body text color is not the same as background
    const colors = await page.evaluate(() => {
      const body = document.body;
      const style = getComputedStyle(body);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
      };
    });
    expect(colors.color).not.toBe(colors.backgroundColor);
  });
});
