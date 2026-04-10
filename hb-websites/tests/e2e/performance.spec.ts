import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('homepage loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test('explore page loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/explore', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test('LCP element exists on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // The largest contentful paint element is typically a hero image or heading
    const lcpCandidate = page.locator('main img, main h1, main section').first();
    await expect(lcpCandidate).toBeVisible();
  });

  test('no JavaScript errors on homepage', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Allow known benign errors but catch critical ones
    const criticalErrors = jsErrors.filter(
      (err) => !err.includes('ResizeObserver') && !err.includes('Non-Error promise rejection')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('no failed network requests for critical resources', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 500 && response.url().includes(page.url().split('/')[2])) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(failedRequests).toHaveLength(0);
  });

  test('page sends minimal number of requests', async ({ page }) => {
    let requestCount = 0;
    page.on('request', () => {
      requestCount++;
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    // Reasonable limit - homepage should not make excessive requests
    expect(requestCount).toBeLessThan(100);
  });

  test('images use lazy loading', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const images = page.locator('main img');
    const count = await images.count();
    if (count > 2) {
      // At least some images below the fold should have loading="lazy"
      const lazyImages = page.locator('main img[loading="lazy"]');
      const lazyCount = await lazyImages.count();
      expect(lazyCount).toBeGreaterThanOrEqual(1);
    }
  });
});
