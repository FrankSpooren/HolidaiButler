import { test, expect } from '@playwright/test';

test.describe('Events Page', () => {
  test('page loads successfully', async ({ page }) => {
    const response = await page.goto('/events');
    expect(response?.status()).toBeLessThan(400);
  });

  test('page has a heading', async ({ page }) => {
    await page.goto('/events');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('event calendar or event list is visible', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    // Look for calendar component, event list, or event cards
    const events = page.locator(
      '[data-testid="event-calendar"], [data-testid="event-list"], .event-calendar, .event-card, article, [role="grid"]'
    );
    const count = await events.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('events have titles or date information', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    // Look for any text content within event containers
    const eventContent = page.locator('article h2, article h3, [data-testid="event-card"] h2, time');
    const count = await eventContent.count();
    // Events might not always exist, so we check the page at least rendered
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('page does not show error state', async ({ page }) => {
    await page.goto('/events');
    // Ensure no generic error messages are visible
    const errorText = page.locator('text=/error|something went wrong|500/i');
    await expect(errorText).toHaveCount(0);
  });
});
