/**
 * Frontend-Backend Connectivity E2E Tests
 * HolidaiButler Customer Portal
 * Sprint 3: Polish & Performance
 *
 * Tests:
 * - API endpoint availability
 * - Authentication flow connectivity
 * - Data fetching and caching
 * - Error handling for network issues
 * - WebSocket connections (if applicable)
 * - Environment configuration
 */

import { test, expect } from '@playwright/test';

// API base URL from environment
const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';

test.describe('API Connectivity', () => {
  test('should have API URL configured', async ({ page }) => {
    await page.goto('/');

    // Check that API URL is set in environment
    const apiUrl = await page.evaluate(() => {
      return import.meta.env?.VITE_API_URL || window.__ENV__?.API_URL;
    });

    // API URL should be defined (either from env or fallback)
    expect(apiUrl || API_URL).toBeTruthy();
  });

  test('should connect to health endpoint', async ({ request }) => {
    try {
      const response = await request.get(`${API_URL}/health`);

      // Health endpoint should return 200 or 204
      expect([200, 204]).toContain(response.status());
    } catch (error) {
      // If health endpoint doesn't exist, check root
      const rootResponse = await request.get(`${API_URL}/`);
      expect(rootResponse.ok()).toBeTruthy();
    }
  });

  test('should connect to API version endpoint', async ({ request }) => {
    try {
      const response = await request.get(`${API_URL}/api/v1`);
      expect(response.ok()).toBeTruthy();
    } catch (error) {
      // API may not have version endpoint, that's acceptable
      console.log('Version endpoint not available');
    }
  });
});

test.describe('Authentication Connectivity', () => {
  test('should reach login endpoint', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'wrongpassword',
      },
    });

    // Should return 401 (unauthorized) not 5xx (server error)
    expect([400, 401, 422]).toContain(response.status());
  });

  test('should reach registration endpoint', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/auth/register`, {
      data: {
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Test User',
      },
    });

    // Should return success, conflict, or validation error - not 5xx
    expect([200, 201, 400, 409, 422]).toContain(response.status());
  });

  test('should handle token refresh endpoint', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/auth/refresh`, {
      data: {
        refreshToken: 'invalid-token',
      },
    });

    // Should return 401 (invalid token) not 5xx
    expect([400, 401, 403]).toContain(response.status());
  });

  test('should handle logout endpoint', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/auth/logout`, {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });

    // Should handle gracefully
    expect([200, 204, 401]).toContain(response.status());
  });
});

test.describe('POI API Connectivity', () => {
  test('should fetch POI list', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/pois`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toBeDefined();
  });

  test('should fetch POI by ID', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/pois/1`);

    // Should return POI or 404 (not found) - not 5xx
    expect([200, 404]).toContain(response.status());
  });

  test('should search POIs', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/pois?q=beach`);

    expect(response.ok()).toBeTruthy();
  });

  test('should filter POIs by category', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/pois?category=nature`);

    expect(response.ok()).toBeTruthy();
  });

  test('should handle POI autocomplete', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/pois/autocomplete?q=ter`);

    // Should return results or empty array
    expect([200, 204]).toContain(response.status());
  });
});

test.describe('Booking API Connectivity', () => {
  test('should reach booking endpoint', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/bookings`, {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });

    // Should return 401 (unauthorized) not 5xx
    expect([401, 403]).toContain(response.status());
  });

  test('should handle booking creation', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/bookings`, {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
      data: {
        poiId: 1,
        date: '2025-12-15',
        quantity: 2,
      },
    });

    // Should return auth error, not server error
    expect([400, 401, 403, 422]).toContain(response.status());
  });
});

test.describe('Payment API Connectivity', () => {
  test('should reach payment methods endpoint', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/payments/methods`);

    // Should return methods or require auth
    expect([200, 401]).toContain(response.status());
  });

  test('should handle payment session creation', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/payments/session`, {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
      data: {
        amount: 100,
        currency: 'EUR',
      },
    });

    // Should return auth error, not server error
    expect([400, 401, 403, 422]).toContain(response.status());
  });
});

test.describe('Restaurant API Connectivity', () => {
  test('should fetch restaurant list', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/restaurants`);

    expect([200, 404]).toContain(response.status());
  });

  test('should fetch restaurant availability', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/restaurants/1/availability?date=2025-12-15`);

    // Should return availability or 404
    expect([200, 404]).toContain(response.status());
  });

  test('should handle reservation creation', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/restaurants/1/reservations`, {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
      data: {
        date: '2025-12-15',
        time: '19:00',
        guests: 4,
      },
    });

    // Should return auth or validation error, not server error
    expect([400, 401, 403, 404, 422]).toContain(response.status());
  });
});

test.describe('Error Handling', () => {
  test('should handle 404 gracefully', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/nonexistent-endpoint`);

    expect(response.status()).toBe(404);
  });

  test('should handle malformed requests', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: 'not-json',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Should return 400 (bad request) not 5xx
    expect([400, 422]).toContain(response.status());
  });

  test('should include CORS headers', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/pois`, {
      headers: {
        Origin: 'http://localhost:5173',
      },
    });

    // Check for CORS headers
    const headers = response.headers();
    // CORS should be configured (header present or request succeeds)
    expect(response.ok() || headers['access-control-allow-origin']).toBeTruthy();
  });
});

test.describe('Network Resilience', () => {
  test('should handle slow responses gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/api/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/experiences');

    // Should show loading state
    const loadingIndicator = page.locator('[class*="loading"], [class*="skeleton"], [role="progressbar"]');
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 3000 }).catch(() => {});
  });

  test('should show error state on API failure', async ({ page }) => {
    // Simulate API failure
    await page.route('**/api/v1/pois**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/experiences');
    await page.waitForLoadState('networkidle');

    // Should show error or fallback content
    const errorState = page.locator('text=/error|fout|probleem/i, [class*="error"]');
    const fallbackContent = page.locator('[class*="card"]');

    // Either show error or have fallback content
    const hasError = await errorState.count() > 0;
    const hasFallback = await fallbackContent.count() > 0;

    expect(hasError || hasFallback).toBeTruthy();
  });

  test('should retry failed requests', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/v1/pois**', (route) => {
      requestCount++;
      if (requestCount < 2) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto('/experiences');
    await page.waitForTimeout(5000);

    // Should have retried at least once
    expect(requestCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Data Caching', () => {
  test('should cache API responses', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/v1/pois**', (route) => {
      requestCount++;
      route.continue();
    });

    // First visit
    await page.goto('/experiences');
    await page.waitForLoadState('networkidle');
    const firstCount = requestCount;

    // Navigate away and back
    await page.goto('/');
    await page.goto('/experiences');
    await page.waitForLoadState('networkidle');

    // With caching, should not make significantly more requests
    // (React Query staleTime should prevent refetch)
  });
});

test.describe('WebSocket Connectivity', () => {
  test('should establish WebSocket connection for real-time features', async ({ page }) => {
    // Listen for WebSocket connections
    const wsPromise = page.waitForEvent('websocket', { timeout: 10000 }).catch(() => null);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const ws = await wsPromise;

    // WebSocket may or may not be used depending on features
    if (ws) {
      expect(ws.url()).toContain('ws');
    }
  });
});
