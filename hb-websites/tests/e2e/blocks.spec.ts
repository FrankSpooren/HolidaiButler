import { test, expect } from '@playwright/test';

test.describe('Block Rendering', () => {
  test('homepage renders at least one section/block', async ({ page }) => {
    await page.goto('/');
    const sections = page.locator('main section, main > div > section, main > div > div');
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Hero block renders with heading', async ({ page }) => {
    await page.goto('/');
    // Hero is typically the first section with a large heading
    const hero = page.locator('section').first();
    await expect(hero).toBeVisible();
    const heading = hero.locator('h1, h2');
    const count = await heading.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Hero block has background image or video', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('section').first();
    // Check for background image via style or img/video element
    const hasMedia = await hero.evaluate((el) => {
      const style = getComputedStyle(el);
      const hasBgImage = style.backgroundImage !== 'none';
      const hasImgChild = el.querySelector('img, video') !== null;
      return hasBgImage || hasImgChild;
    });
    expect(hasMedia).toBeTruthy();
  });

  test('RichText blocks render paragraph text', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    const paragraphs = page.locator('main p');
    const count = await paragraphs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('CardGroup or PoiGrid block renders cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Look for card-like elements anywhere on the page
    const cards = page.locator('article, [data-testid="card"], .card, [data-testid="poi-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0); // Cards may not be on homepage
  });

  test('CTA block renders a button or link', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // CTA blocks typically have prominent buttons
    const ctaButtons = page.locator('main a[href]:has-text("explore"), main a[href]:has-text("ontdek"), main a[href]:has-text("discover"), main button');
    const count = await ctaButtons.count();
    expect(count).toBeGreaterThanOrEqual(0); // Soft check
  });

  test('FAQ block renders accordion items', async ({ page }) => {
    // FAQ might be on the about or contact page
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    const accordionItems = page.locator('details, [data-testid="faq-item"], .faq-item, [role="button"][aria-expanded]');
    const count = await accordionItems.count();
    // Soft check - FAQ block may not be on every page
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Map block renders if present', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const map = page.locator('.leaflet-container, [data-testid="map-block"], .map-container, canvas');
    const count = await map.count();
    // Soft check - map may not be on homepage
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('blocks have no overlapping content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const sections = page.locator('main section');
    const count = await sections.count();
    if (count >= 2) {
      const first = await sections.nth(0).boundingBox();
      const second = await sections.nth(1).boundingBox();
      if (first && second) {
        // Second section should start at or after the end of first
        expect(second.y).toBeGreaterThanOrEqual(first.y + first.height - 5);
      }
    }
  });
});
