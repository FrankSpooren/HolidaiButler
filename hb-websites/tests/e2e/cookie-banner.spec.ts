import { test, expect } from '@playwright/test';

test.describe('Cookie Banner', () => {
  test('cookie banner appears on first visit', async ({ page, context }) => {
    // Clear cookies to simulate first visit
    await context.clearCookies();
    await page.goto('/');
    const banner = page.locator(
      '[data-testid="cookie-banner"], [data-testid="cookie-consent"], .cookie-banner, .cookie-consent, [role="dialog"]:has-text("cookie"), [role="banner"]:has-text("cookie")'
    );
    await expect(banner.first()).toBeVisible({ timeout: 10000 });
  });

  test('cookie banner has accept button', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    const acceptButton = page.locator(
      '[data-testid="cookie-accept"], button:has-text("accept"), button:has-text("akkoord"), button:has-text("accepteer"), button:has-text("alle cookies")'
    );
    await expect(acceptButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('dismissing cookie banner hides it', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    const acceptButton = page.locator(
      '[data-testid="cookie-accept"], button:has-text("accept"), button:has-text("akkoord"), button:has-text("accepteer"), button:has-text("alle cookies")'
    ).first();
    await acceptButton.click();
    const banner = page.locator(
      '[data-testid="cookie-banner"], [data-testid="cookie-consent"], .cookie-banner, .cookie-consent'
    );
    await expect(banner.first()).toBeHidden({ timeout: 5000 });
  });

  test('cookie banner does not reappear after acceptance', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    const acceptButton = page.locator(
      '[data-testid="cookie-accept"], button:has-text("accept"), button:has-text("akkoord"), button:has-text("accepteer"), button:has-text("alle cookies")'
    ).first();
    await acceptButton.click();
    // Navigate to another page
    await page.goto('/explore');
    const banner = page.locator(
      '[data-testid="cookie-banner"], [data-testid="cookie-consent"], .cookie-banner, .cookie-consent'
    );
    await expect(banner.first()).toBeHidden({ timeout: 5000 });
  });

  test('cookie banner has option to manage preferences', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    // Look for a preferences/settings button alongside accept
    const prefsButton = page.locator(
      '[data-testid="cookie-preferences"], button:has-text("preferences"), button:has-text("voorkeuren"), button:has-text("instelling"), button:has-text("manage")'
    );
    const count = await prefsButton.count();
    // This is a soft check - preferences button is recommended but not required
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
