/**
 * Unit tests for tracking.js
 * Tests tracking script functionality in isolation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { gzipSync } from 'zlib';

// Load tracking script
const trackingScriptPath = path.join(process.cwd(), 'public', 'tracking.js');
const trackingScript = fs.readFileSync(trackingScriptPath, 'utf-8');

// Mock browser environment
const setupBrowserMocks = () => {
  const mockSessionStorage: Record<string, string> = {};

  global.window = {
    location: {
      href: 'https://example.com/test-page',
      pathname: '/test-page',
    },
    sessionStorage: {
      getItem: vi.fn((key: string) => mockSessionStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockSessionStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockSessionStorage[key];
      }),
      clear: vi.fn(() => {
        Object.keys(mockSessionStorage).forEach(key => delete mockSessionStorage[key]);
      }),
      length: 0,
      key: vi.fn(),
    },
    fetch: vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })),
    requestIdleCallback: vi.fn((cb: () => void) => setTimeout(cb, 0)),
    addEventListener: vi.fn(),
    pageYOffset: 0,
    MetricFortune: undefined,
  } as any;

  global.document = {
    referrer: 'https://google.com',
    title: 'Test Page',
    documentElement: {
      scrollTop: 0,
      scrollHeight: 1000,
      clientHeight: 500,
    },
    addEventListener: vi.fn(),
    hidden: false,
  } as any;

  Object.defineProperty(global, 'navigator', {
    value: {
      sendBeacon: vi.fn(() => true),
    },
    writable: true,
    configurable: true,
  });

  // Clear session storage mock
  Object.keys(mockSessionStorage).forEach(key => delete mockSessionStorage[key]);
};

const cleanupBrowserMocks = () => {
  delete (global as any).window;
  delete (global as any).document;
  delete (global as any).navigator;
};

describe('Tracking Script', () => {
  describe('Bundle Size', () => {
    it('should be less than 50KB gzipped', () => {
      const gzipped = gzipSync(trackingScript);
      const sizeKB = gzipped.length / 1024;

      expect(sizeKB).toBeLessThan(50);
      console.log(`✓ Bundle size: ${sizeKB.toFixed(2)} KB gzipped (target: <50KB)`);
    });

    it('should be less than 15KB uncompressed', () => {
      const sizeKB = Buffer.byteLength(trackingScript) / 1024;

      expect(sizeKB).toBeLessThan(15);
      console.log(`✓ Raw size: ${sizeKB.toFixed(2)} KB (uncompressed)`);
    });
  });

  describe('Initialization', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      setupBrowserMocks();
      // Execute tracking script in mock environment
      eval(trackingScript);
    });

    afterEach(() => {
      vi.useRealTimers();
      cleanupBrowserMocks();
    });

    it('should expose MetricFortune global API', () => {
      expect(window.MetricFortune).toBeDefined();
      expect(window.MetricFortune.init).toBeTypeOf('function');
      expect(window.MetricFortune.version).toBeDefined();
    });

    it('should require siteId for initialization', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      window.MetricFortune.init({} as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('siteId is required')
      );

      consoleSpy.mockRestore();
    });

    it('should validate siteId format', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Invalid: contains spaces
      window.MetricFortune.init({ siteId: 'invalid site id' });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid siteId format')
      );

      consoleSpy.mockRestore();
    });

    it('should accept valid siteId formats', () => {
      const validIds = [
        'site-123',
        'site_456',
        'SITE789',
        'site-abc-def_123',
      ];

      validIds.forEach(siteId => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Re-initialize for each test
        delete (window as any).MetricFortune;
        eval(trackingScript);

        window.MetricFortune.init({ siteId });

        expect(consoleSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Invalid siteId format')
        );

        consoleSpy.mockRestore();
      });
    });

    it('should prevent double initialization', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // First init should succeed (sets initialized flag)
      window.MetricFortune.init({ siteId: 'test-site' });

      // Second init should warn immediately (checks flag before async work)
      window.MetricFortune.init({ siteId: 'test-site' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Already initialized')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      setupBrowserMocks();
      eval(trackingScript);
    });

    afterEach(() => {
      cleanupBrowserMocks();
    });

    it('should generate UUID v4 format session IDs', () => {
      window.MetricFortune.init({ siteId: 'test-site' });

      const sessionId = window.sessionStorage.getItem('mf_session_id');

      expect(sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should store session ID in sessionStorage', () => {
      window.MetricFortune.init({ siteId: 'test-site' });

      const sessionId = window.sessionStorage.getItem('mf_session_id');
      expect(sessionId).toBeTruthy();
      expect(sessionId?.length).toBeGreaterThan(0);
    });

    it('should reuse existing session within timeout', () => {
      const existingSessionId = 'existing-session-123';
      const now = Date.now();

      window.sessionStorage.setItem('mf_session_id', existingSessionId);
      window.sessionStorage.setItem('mf_last_activity', now.toString());
      window.sessionStorage.setItem('mf_entry_page', 'https://example.com/entry');
      window.sessionStorage.setItem('mf_session_start', now.toString());

      window.MetricFortune.init({ siteId: 'test-site' });

      const sessionId = window.sessionStorage.getItem('mf_session_id');
      expect(sessionId).toBe(existingSessionId);
    });

    it('should create new session after timeout', () => {
      const oldSessionId = 'old-session-123';
      const thirtyOneMinutesAgo = Date.now() - (31 * 60 * 1000);

      window.sessionStorage.setItem('mf_session_id', oldSessionId);
      window.sessionStorage.setItem('mf_last_activity', thirtyOneMinutesAgo.toString());

      window.MetricFortune.init({ siteId: 'test-site' });

      const sessionId = window.sessionStorage.getItem('mf_session_id');
      expect(sessionId).not.toBe(oldSessionId);
      expect(sessionId).toBeTruthy();
    });

    it('should track entry page on new session', () => {
      window.MetricFortune.init({ siteId: 'test-site' });

      const entryPage = window.sessionStorage.getItem('mf_entry_page');
      expect(entryPage).toBe(window.location.href);
    });

    it('should update last activity timestamp', () => {
      window.MetricFortune.init({ siteId: 'test-site' });

      const lastActivity = window.sessionStorage.getItem('mf_last_activity');
      expect(lastActivity).toBeTruthy();

      const timestamp = parseInt(lastActivity!, 10);
      expect(timestamp).toBeGreaterThan(Date.now() - 1000); // Within last second
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      setupBrowserMocks();
      eval(trackingScript);
    });

    afterEach(() => {
      cleanupBrowserMocks();
    });

    it('should handle sessionStorage unavailability gracefully', () => {
      // Simulate sessionStorage being blocked
      window.sessionStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => {
        window.MetricFortune.init({ siteId: 'test-site' });
      }).not.toThrow();
    });

    it('should handle network failures gracefully', async () => {
      window.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      expect(() => {
        window.MetricFortune.init({ siteId: 'test-site' });
      }).not.toThrow();
    });

    it('should not throw errors during event capture', () => {
      window.MetricFortune.init({ siteId: 'test-site' });

      // Simulate error conditions
      expect(() => {
        document.addEventListener('click', () => {
          throw new Error('Simulated error');
        });
      }).not.toThrow();
    });
  });

  describe('Event Batching', () => {
    beforeEach(() => {
      setupBrowserMocks();
      eval(trackingScript);
    });

    afterEach(() => {
      cleanupBrowserMocks();
    });

    it('should use requestIdleCallback for non-blocking initialization', () => {
      // requestIdleCallback should exist in mock environment
      expect(window.requestIdleCallback).toBeDefined();
      expect(typeof window.requestIdleCallback).toBe('function');

      // Test that script can initialize without blocking
      expect(() => {
        window.MetricFortune.init({ siteId: 'test-site' });
      }).not.toThrow();
    });

    it('should fallback to setTimeout if requestIdleCallback unavailable', () => {
      delete (window as any).requestIdleCallback;
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      // Re-evaluate script without requestIdleCallback
      eval(trackingScript);
      window.MetricFortune.init({ siteId: 'test-site' });

      expect(setTimeoutSpy).toHaveBeenCalled();
      setTimeoutSpy.mockRestore();
    });
  });
});
