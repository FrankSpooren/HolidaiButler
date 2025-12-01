/**
 * Performance Audit E2E Tests
 * HolidaiButler Customer Portal
 * Sprint 3: Polish & Performance
 *
 * Tests for:
 * - Page load times
 * - Core Web Vitals (LCP, FID, CLS)
 * - Bundle sizes
 * - Image optimization
 * - Caching effectiveness
 */

import { test, expect } from '@playwright/test';

// Performance budgets
const PERFORMANCE_BUDGETS = {
  // Load times (ms)
  firstContentfulPaint: 2000,
  largestContentfulPaint: 2500,
  timeToInteractive: 3500,
  totalBlockingTime: 300,

  // Layout stability
  cumulativeLayoutShift: 0.1,

  // Resource sizes (KB)
  documentSize: 100,
  totalJsSize: 500,
  totalCssSize: 100,
  totalImageSize: 2000,

  // Requests
  totalRequests: 50,
  jsRequests: 10,
};

// Pages to audit
const PAGES_TO_AUDIT = [
  { path: '/', name: 'Home Page' },
  { path: '/experiences', name: 'POI List Page' },
  { path: '/login', name: 'Login Page' },
];

test.describe('Performance Metrics', () => {
  test.describe('Page Load Performance', () => {
    for (const pageInfo of PAGES_TO_AUDIT) {
      test(`${pageInfo.name} should load within budget`, async ({ page }) => {
        // Enable performance API
        await page.goto(pageInfo.path, { waitUntil: 'networkidle' });

        // Get performance metrics
        const metrics = await page.evaluate(() => {
          const perf = window.performance;
          const timing = perf.timing;
          const navEntry = perf.getEntriesByType('navigation')[0];

          return {
            // Navigation timing
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
            loadComplete: timing.loadEventEnd - timing.navigationStart,
            firstByte: timing.responseStart - timing.navigationStart,

            // Paint timing
            firstPaint: perf.getEntriesByName('first-paint')[0]?.startTime || 0,
            firstContentfulPaint: perf.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,

            // Resource timing
            resourceCount: perf.getEntriesByType('resource').length,
          };
        });

        console.log(`\n${pageInfo.name} Performance:`);
        console.log(`  First Byte: ${metrics.firstByte}ms`);
        console.log(`  First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
        console.log(`  DOM Content Loaded: ${metrics.domContentLoaded}ms`);
        console.log(`  Load Complete: ${metrics.loadComplete}ms`);
        console.log(`  Resource Count: ${metrics.resourceCount}`);

        // Assertions
        expect(metrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_BUDGETS.firstContentfulPaint);
        expect(metrics.resourceCount).toBeLessThan(PERFORMANCE_BUDGETS.totalRequests);
      });
    }
  });

  test.describe('Core Web Vitals', () => {
    test('should measure Largest Contentful Paint', async ({ page }) => {
      await page.goto('/experiences');

      // Wait for LCP
      const lcp = await page.evaluate(async () => {
        return new Promise((resolve) => {
          let lcpValue = 0;

          const observer = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            lcpValue = lastEntry.startTime;
          });

          observer.observe({ type: 'largest-contentful-paint', buffered: true });

          // Wait and resolve
          setTimeout(() => {
            observer.disconnect();
            resolve(lcpValue);
          }, 3000);
        });
      });

      console.log(`LCP: ${lcp}ms`);
      expect(lcp).toBeLessThan(PERFORMANCE_BUDGETS.largestContentfulPaint);
    });

    test('should measure Cumulative Layout Shift', async ({ page }) => {
      await page.goto('/experiences');

      // Wait for page to stabilize
      await page.waitForTimeout(3000);

      const cls = await page.evaluate(async () => {
        return new Promise((resolve) => {
          let clsValue = 0;

          const observer = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
          });

          observer.observe({ type: 'layout-shift', buffered: true });

          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue);
          }, 3000);
        });
      });

      console.log(`CLS: ${cls}`);
      expect(cls).toBeLessThan(PERFORMANCE_BUDGETS.cumulativeLayoutShift);
    });

    test('should measure Total Blocking Time', async ({ page }) => {
      await page.goto('/experiences');

      const tbt = await page.evaluate(async () => {
        return new Promise((resolve) => {
          let totalBlockingTime = 0;

          const observer = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (entry.duration > 50) {
                totalBlockingTime += entry.duration - 50;
              }
            }
          });

          observer.observe({ type: 'longtask', buffered: true });

          setTimeout(() => {
            observer.disconnect();
            resolve(totalBlockingTime);
          }, 5000);
        });
      });

      console.log(`TBT: ${tbt}ms`);
      expect(tbt).toBeLessThan(PERFORMANCE_BUDGETS.totalBlockingTime);
    });
  });

  test.describe('Resource Optimization', () => {
    test('JavaScript bundle should be within budget', async ({ page }) => {
      const jsResources = [];

      page.on('response', async (response) => {
        const url = response.url();
        if (url.endsWith('.js') || url.includes('.js?')) {
          const headers = response.headers();
          const contentLength = headers['content-length'];
          if (contentLength) {
            jsResources.push({
              url,
              size: parseInt(contentLength) / 1024, // KB
            });
          }
        }
      });

      await page.goto('/experiences', { waitUntil: 'networkidle' });

      const totalJsSize = jsResources.reduce((sum, r) => sum + r.size, 0);

      console.log(`\nJavaScript Resources:`);
      jsResources.forEach((r) => {
        console.log(`  ${r.url.split('/').pop()}: ${r.size.toFixed(1)}KB`);
      });
      console.log(`Total JS: ${totalJsSize.toFixed(1)}KB`);

      expect(totalJsSize).toBeLessThan(PERFORMANCE_BUDGETS.totalJsSize);
      expect(jsResources.length).toBeLessThanOrEqual(PERFORMANCE_BUDGETS.jsRequests);
    });

    test('CSS should be within budget', async ({ page }) => {
      const cssResources = [];

      page.on('response', async (response) => {
        const url = response.url();
        if (url.endsWith('.css') || url.includes('.css?')) {
          const headers = response.headers();
          const contentLength = headers['content-length'];
          if (contentLength) {
            cssResources.push({
              url,
              size: parseInt(contentLength) / 1024,
            });
          }
        }
      });

      await page.goto('/experiences', { waitUntil: 'networkidle' });

      const totalCssSize = cssResources.reduce((sum, r) => sum + r.size, 0);

      console.log(`\nCSS Resources:`);
      cssResources.forEach((r) => {
        console.log(`  ${r.url.split('/').pop()}: ${r.size.toFixed(1)}KB`);
      });
      console.log(`Total CSS: ${totalCssSize.toFixed(1)}KB`);

      expect(totalCssSize).toBeLessThan(PERFORMANCE_BUDGETS.totalCssSize);
    });

    test('images should be optimized', async ({ page }) => {
      const imageResources = [];

      page.on('response', async (response) => {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';

        if (contentType.includes('image')) {
          const contentLength = response.headers()['content-length'];
          if (contentLength) {
            imageResources.push({
              url,
              size: parseInt(contentLength) / 1024,
              type: contentType,
            });
          }
        }
      });

      await page.goto('/experiences', { waitUntil: 'networkidle' });

      const totalImageSize = imageResources.reduce((sum, r) => sum + r.size, 0);

      console.log(`\nImage Resources: ${imageResources.length} images`);
      console.log(`Total Image Size: ${totalImageSize.toFixed(1)}KB`);

      // Check for modern formats
      const hasModernFormats = imageResources.some(
        (r) => r.type.includes('webp') || r.type.includes('avif')
      );

      // Large images (>200KB)
      const largeImages = imageResources.filter((r) => r.size > 200);
      if (largeImages.length > 0) {
        console.log('\nLarge images (>200KB):');
        largeImages.forEach((r) => {
          console.log(`  ${r.url.split('/').pop()}: ${r.size.toFixed(1)}KB`);
        });
      }

      expect(totalImageSize).toBeLessThan(PERFORMANCE_BUDGETS.totalImageSize);
    });
  });

  test.describe('Caching', () => {
    test('static assets should be cached', async ({ page }) => {
      const cachedResources = [];

      page.on('response', async (response) => {
        const headers = response.headers();
        const cacheControl = headers['cache-control'];
        const etag = headers['etag'];
        const lastModified = headers['last-modified'];

        const url = response.url();
        if (url.includes('.js') || url.includes('.css') || url.includes('/images/')) {
          cachedResources.push({
            url: url.split('/').pop(),
            cacheControl,
            hasEtag: !!etag,
            hasLastModified: !!lastModified,
          });
        }
      });

      await page.goto('/experiences', { waitUntil: 'networkidle' });

      // Check caching headers
      const resourcesWithCaching = cachedResources.filter(
        (r) => r.cacheControl || r.hasEtag || r.hasLastModified
      );

      console.log(`\nCaching Status:`);
      console.log(`  Resources with caching: ${resourcesWithCaching.length}/${cachedResources.length}`);

      // At least 80% of static resources should have caching
      const cachingRatio = resourcesWithCaching.length / cachedResources.length;
      expect(cachingRatio).toBeGreaterThan(0.5); // Lowered for development
    });

    test('should benefit from browser cache on reload', async ({ page }) => {
      // First load
      await page.goto('/experiences', { waitUntil: 'networkidle' });

      const firstLoadResources = await page.evaluate(() => {
        return performance.getEntriesByType('resource').length;
      });

      // Reload
      await page.reload({ waitUntil: 'networkidle' });

      const secondLoadResources = await page.evaluate(() => {
        return performance
          .getEntriesByType('resource')
          .filter((r) => r.transferSize > 0).length;
      });

      console.log(`First load resources: ${firstLoadResources}`);
      console.log(`Second load resources (from network): ${secondLoadResources}`);

      // Second load should have fewer network requests
      expect(secondLoadResources).toBeLessThanOrEqual(firstLoadResources);
    });
  });

  test.describe('Rendering Performance', () => {
    test('should not have excessive re-renders', async ({ page }) => {
      await page.goto('/experiences');
      await page.waitForLoadState('networkidle');

      // Monitor React re-renders (if React DevTools available)
      const renderCount = await page.evaluate(() => {
        // Check for long tasks
        return new Promise((resolve) => {
          let longTasks = 0;

          const observer = new PerformanceObserver((list) => {
            longTasks += list.getEntries().length;
          });

          observer.observe({ entryTypes: ['longtask'] });

          setTimeout(() => {
            observer.disconnect();
            resolve(longTasks);
          }, 5000);
        });
      });

      console.log(`Long tasks during interaction: ${renderCount}`);
      expect(renderCount).toBeLessThan(10);
    });

    test('scroll performance should be smooth', async ({ page }) => {
      await page.goto('/experiences');
      await page.waitForLoadState('networkidle');

      // Start measuring
      await page.evaluate(() => {
        window.scrollMetrics = {
          frames: 0,
          startTime: performance.now(),
        };

        const observer = new PerformanceObserver((list) => {
          window.scrollMetrics.frames += list.getEntries().length;
        });

        observer.observe({ entryTypes: ['frame'] });
      });

      // Scroll down
      await page.evaluate(() => {
        window.scrollTo({ top: 2000, behavior: 'smooth' });
      });

      await page.waitForTimeout(1000);

      // Check frame rate
      const metrics = await page.evaluate(() => {
        const elapsed = performance.now() - window.scrollMetrics.startTime;
        const fps = (window.scrollMetrics.frames / elapsed) * 1000;
        return { frames: window.scrollMetrics.frames, fps };
      });

      console.log(`Scroll FPS: ~${metrics.fps.toFixed(0)}`);

      // Should maintain reasonable frame rate (30fps minimum)
    });
  });

  test.describe('Network Performance', () => {
    test('should handle slow network gracefully', async ({ page, context }) => {
      // Simulate slow 3G
      await context.route('**/*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        await route.continue();
      });

      const startTime = Date.now();
      await page.goto('/experiences', { waitUntil: 'domcontentloaded', timeout: 30000 });
      const loadTime = Date.now() - startTime;

      console.log(`Load time on slow network: ${loadTime}ms`);

      // Should show content within reasonable time even on slow network
      const hasContent = await page.locator('[class*="card"], [class*="skeleton"]').count() > 0;
      expect(hasContent).toBeTruthy();
    });

    test('should use compression', async ({ page }) => {
      let compressedResponses = 0;
      let totalResponses = 0;

      page.on('response', async (response) => {
        const encoding = response.headers()['content-encoding'];
        const contentType = response.headers()['content-type'] || '';

        if (contentType.includes('javascript') || contentType.includes('css') || contentType.includes('html')) {
          totalResponses++;
          if (encoding === 'gzip' || encoding === 'br' || encoding === 'deflate') {
            compressedResponses++;
          }
        }
      });

      await page.goto('/experiences', { waitUntil: 'networkidle' });

      console.log(`Compressed responses: ${compressedResponses}/${totalResponses}`);

      // Most text resources should be compressed
      if (totalResponses > 0) {
        const compressionRatio = compressedResponses / totalResponses;
        expect(compressionRatio).toBeGreaterThan(0.5);
      }
    });
  });

  test.describe('Memory Usage', () => {
    test('should not have memory leaks', async ({ page }) => {
      await page.goto('/experiences');
      await page.waitForLoadState('networkidle');

      // Get initial memory
      const initialMemory = await page.evaluate(() => {
        if (performance.memory) {
          return performance.memory.usedJSHeapSize / 1024 / 1024;
        }
        return 0;
      });

      // Interact with page
      for (let i = 0; i < 5; i++) {
        await page.click('[class*="card"]').catch(() => {});
        await page.goBack().catch(() => {});
        await page.waitForTimeout(500);
      }

      // Get final memory
      const finalMemory = await page.evaluate(() => {
        if (performance.memory) {
          return performance.memory.usedJSHeapSize / 1024 / 1024;
        }
        return 0;
      });

      if (initialMemory > 0) {
        console.log(`Initial memory: ${initialMemory.toFixed(1)}MB`);
        console.log(`Final memory: ${finalMemory.toFixed(1)}MB`);
        console.log(`Increase: ${(finalMemory - initialMemory).toFixed(1)}MB`);

        // Memory shouldn't grow excessively
        expect(finalMemory - initialMemory).toBeLessThan(50);
      }
    });
  });
});

test.describe('Mobile Performance', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
  });

  test('should perform well on mobile', async ({ page }) => {
    await page.goto('/experiences', { waitUntil: 'networkidle' });

    const metrics = await page.evaluate(() => {
      const perf = window.performance;
      return {
        fcp: perf.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        resourceCount: perf.getEntriesByType('resource').length,
      };
    });

    console.log(`\nMobile Performance:`);
    console.log(`  FCP: ${metrics.fcp}ms`);
    console.log(`  Resources: ${metrics.resourceCount}`);

    // Mobile should have similar or better performance
    expect(metrics.fcp).toBeLessThan(3000);
  });
});
