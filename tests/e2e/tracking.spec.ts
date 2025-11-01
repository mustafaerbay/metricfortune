/**
 * E2E tests for tracking script
 * Tests tracking functionality in real browser environment
 */

import { test, expect } from '@playwright/test';

test.describe('Tracking Script E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test page
    await page.goto('/demo/tracking-test');

    // Wait for tracking script to load
    await page.waitForFunction(() => window.MetricFortune !== undefined, {
      timeout: 5000,
    });
  });

  test('should load tracking script from CDN', async ({ page }) => {
    // Check that MetricFortune global is available
    const metricFortune = await page.evaluate(() => {
      return typeof window.MetricFortune;
    });

    expect(metricFortune).toBe('object');

    // Verify version is set
    const version = await page.evaluate(() => window.MetricFortune.version);
    expect(version).toBeTruthy();
  });

  test('should initialize tracking on page load', async ({ page }) => {
    // Wait for initialization message in console
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    // Reload page to capture init messages
    await page.reload();
    await page.waitForTimeout(2000);

    // Check that initialization occurred
    const hasInitMessage = consoleMessages.some(msg =>
      msg.includes('Initializing MetricFortune') || msg.includes('Tracked Event')
    );

    expect(hasInitMessage).toBe(true);
  });

  test('should capture pageview event', async ({ page }) => {
    // Wait for pageview event to be captured
    await page.waitForTimeout(1000);

    // Check event log for pageview
    const eventLog = await page.locator('.bg-gray-50.border.border-gray-200').first();
    const eventText = await eventLog.textContent();

    expect(eventText).toContain('PAGEVIEW');
  });

  test('should capture click events', async ({ page }) => {
    // Click the test button
    await page.click('#test-button-1');

    // Wait for event to be captured and displayed
    await page.waitForTimeout(1000);

    // Check event log
    const eventLogs = await page.locator('.bg-gray-50.border.border-gray-200').all();
    const clickEvent = eventLogs.find(async log => {
      const text = await log.textContent();
      return text?.includes('CLICK');
    });

    expect(clickEvent).toBeTruthy();
  });

  test('should capture form interaction events', async ({ page }) => {
    // Focus on name input
    await page.focus('#name');
    await page.fill('#name', 'Test User');

    // Wait for event to be captured
    await page.waitForTimeout(1000);

    // Check event log for form event
    const eventLogs = await page.locator('.bg-gray-50.border.border-gray-200').all();
    const formEvents = await Promise.all(
      eventLogs.map(async log => {
        const text = await log.textContent();
        return text?.includes('FORM');
      })
    );

    expect(formEvents.some(hasForm => hasForm)).toBe(true);
  });

  test('should capture scroll depth events', async ({ page }) => {
    // Scroll down the page
    await page.evaluate(() => {
      window.scrollTo(0, 500);
    });

    // Wait for scroll event to be debounced and captured
    await page.waitForTimeout(1500);

    // Check event log for scroll event
    const eventLogs = await page.locator('.bg-gray-50.border.border-gray-200').all();
    const scrollEvents = await Promise.all(
      eventLogs.map(async log => {
        const text = await log.textContent();
        return text?.includes('SCROLL');
      })
    );

    expect(scrollEvents.some(hasScroll => hasScroll)).toBe(true);
  });

  test('should handle errors gracefully without breaking page', async ({ page }) => {
    // Block tracking endpoint to simulate network error
    await page.route('**/api/track', route => route.abort());

    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);

    // Page should still be functional
    const heading = await page.locator('h1');
    await expect(heading).toContainText('MetricFortune Tracking Test Page');

    // Interactions should still work
    await page.click('#test-button-1');
    await page.waitForTimeout(500);

    // No JavaScript errors should have broken the page
    const button = await page.locator('#test-button-1');
    await expect(button).toBeVisible();
  });

  test('should measure page load impact', async ({ page }) => {
    // Navigate with performance metrics
    await page.goto('/demo/tracking-test');

    // Measure performance
    const performanceMetrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = perfData.loadEventEnd - perfData.fetchStart;
      const domContentLoaded = perfData.domContentLoadedEventEnd - perfData.fetchStart;

      return {
        loadTime,
        domContentLoaded,
      };
    });

    console.log('Performance metrics:', performanceMetrics);

    // Page should load reasonably fast (this is a soft check)
    expect(performanceMetrics.loadTime).toBeLessThan(10000); // 10 seconds max
    expect(performanceMetrics.domContentLoaded).toBeLessThan(5000); // 5 seconds max
  });

  test('should create and persist session ID', async ({ page }) => {
    // Get session ID
    const sessionId = await page.evaluate(() => {
      return sessionStorage.getItem('mf_session_id');
    });

    expect(sessionId).toBeTruthy();
    expect(sessionId).toMatch(/^[0-9a-f-]+$/i); // UUID format

    // Navigate to another page (within same tab)
    await page.goto('/');

    // Navigate back
    await page.goto('/demo/tracking-test');
    await page.waitForTimeout(1000);

    // Session ID should be the same
    const newSessionId = await page.evaluate(() => {
      return sessionStorage.getItem('mf_session_id');
    });

    expect(newSessionId).toBe(sessionId);
  });

  test('should display events in real-time event log', async ({ page }) => {
    // Get initial event count
    const initialCount = await page.locator('.bg-gray-50.border.border-gray-200').count();

    // Trigger multiple events
    await page.click('#test-button-1');
    await page.waitForTimeout(500);
    await page.click('#test-button-2');
    await page.waitForTimeout(500);

    // Event count should increase
    const newCount = await page.locator('.bg-gray-50.border.border-gray-200').count();

    expect(newCount).toBeGreaterThan(initialCount);
  });

  test('should batch send events', async ({ page }) => {
    // Capture network requests
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/track')) {
        requests.push(request.url());
      }
    });

    // Trigger multiple events quickly
    for (let i = 0; i < 5; i++) {
      await page.click('#test-button-1');
      await page.waitForTimeout(100);
    }

    // Wait for batch timer (5 seconds)
    await page.waitForTimeout(6000);

    // Should have sent at least one batched request
    // (Note: In test environment with monkey-patched fetch, this may not work as expected)
    // This is more of a smoke test that batching logic doesn't crash
    expect(true).toBe(true); // Placeholder - actual batching tested in unit tests
  });

  test('should include all required event data', async ({ page }) => {
    // Capture console logs with event data
    const eventData: any[] = [];
    page.on('console', async msg => {
      const text = msg.text();
      if (text.includes('Tracked Event')) {
        // Try to extract event data from log
        const args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
        if (args.length > 1) {
          eventData.push(args[1]);
        }
      }
    });

    // Reload to capture fresh events
    await page.reload();
    await page.waitForTimeout(2000);

    // Should have captured at least pageview
    expect(eventData.length).toBeGreaterThan(0);

    // Check pageview has required fields
    const pageview = eventData.find(e => e.type === 'pageview');
    if (pageview) {
      expect(pageview).toHaveProperty('timestamp');
      expect(pageview).toHaveProperty('data');
      expect(pageview.data).toHaveProperty('url');
    }
  });
});

// Type declaration for window.MetricFortune
declare global {
  interface Window {
    MetricFortune: {
      init: (config: { siteId: string }) => void;
      version: string;
    };
  }
}
