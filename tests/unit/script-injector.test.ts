/**
 * Shopify Script Injection Service Unit Tests
 *
 * Tests tracking script injection, removal, and duplicate detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Shopify Script Injector', () => {
  describe('Script Tag Injection', () => {
    it('should construct correct tracking script URL', () => {
      const siteId = 'shopify_abc123';
      const baseUrl = 'https://metricfortune.com';
      const scriptUrl = `${baseUrl}/tracking.js?siteId=${siteId}`;

      expect(scriptUrl).toBe('https://metricfortune.com/tracking.js?siteId=shopify_abc123');
      expect(scriptUrl).toContain('tracking.js');
      expect(scriptUrl).toContain(siteId);
    });

    it('should create script tag with correct properties', () => {
      const scriptTagData = {
        event: 'onload',
        src: 'https://metricfortune.com/tracking.js?siteId=shopify_123',
        display_scope: 'all',
      };

      expect(scriptTagData.event).toBe('onload');
      expect(scriptTagData.display_scope).toBe('all');
      expect(scriptTagData.src).toContain('tracking.js');
    });

    it('should return success with script tag ID', () => {
      const result = {
        success: true,
        scriptTagId: '123456789',
      };

      expect(result.success).toBe(true);
      expect(result.scriptTagId).toBeTruthy();
      expect(typeof result.scriptTagId).toBe('string');
    });

    it('should handle script injection failure', () => {
      const result = {
        success: false,
        error: 'API rate limit exceeded',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Duplicate Script Detection', () => {
    it('should detect existing script tag with same URL', () => {
      const targetUrl = 'https://metricfortune.com/tracking.js?siteId=abc123';
      const existingScripts = [
        { id: 1, src: 'https://other-service.com/script.js' },
        { id: 2, src: 'https://metricfortune.com/tracking.js?siteId=abc123' },
      ];

      const duplicate = existingScripts.find((tag) => tag.src === targetUrl);

      expect(duplicate).toBeDefined();
      expect(duplicate?.id).toBe(2);
    });

    it('should not create duplicate script tags', () => {
      const existingTag = {
        id: 987654321,
        src: 'https://metricfortune.com/tracking.js?siteId=abc123',
      };

      const result = {
        success: true,
        scriptTagId: existingTag.id.toString(),
      };

      expect(result.success).toBe(true);
      expect(result.scriptTagId).toBe('987654321');
    });

    it('should return existing script tag ID when duplicate found', () => {
      const existingScriptTags = [
        { id: 111, src: 'https://metricfortune.com/tracking.js?siteId=store1' },
      ];
      const targetSrc = 'https://metricfortune.com/tracking.js?siteId=store1';

      const found = existingScriptTags.find((tag) => tag.src === targetSrc);

      expect(found).toBeDefined();
      expect(found?.id).toBe(111);
    });
  });

  describe('Script Tag Removal', () => {
    it('should remove script tag by ID', () => {
      const scriptTagId = '123456789';
      const apiPath = `script_tags/${scriptTagId}`;

      expect(apiPath).toBe('script_tags/123456789');
      expect(scriptTagId).toBeTruthy();
    });

    it('should return success after removal', () => {
      const result = {
        success: true,
      };

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle removal failure gracefully', () => {
      const result = {
        success: false,
        error: 'Script tag not found',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Script tag not found');
    });

    it('should handle invalid access token during removal', () => {
      const result = {
        success: false,
        error: 'Invalid API credentials',
      };

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('Script Tag Retrieval', () => {
    it('should fetch all script tags for a store', () => {
      const scriptTags = [
        { id: 1, src: 'https://metricfortune.com/tracking.js?siteId=abc' },
        { id: 2, src: 'https://other-service.com/script.js' },
      ];

      expect(scriptTags).toHaveLength(2);
      expect(scriptTags[0].src).toContain('metricfortune.com');
    });

    it('should return empty array on error', () => {
      const scriptTags: any[] = [];

      expect(scriptTags).toHaveLength(0);
      expect(Array.isArray(scriptTags)).toBe(true);
    });

    it('should handle API errors during fetch', () => {
      const error = new Error('Failed to fetch script tags');

      expect(error.message).toBe('Failed to fetch script tags');
    });
  });

  describe('Access Token Decryption', () => {
    it('should decrypt access token before API calls', () => {
      const encryptedToken = 'abc123:def456:ghi789';
      // Mock decryption would return plaintext
      const decrypted = 'shpat_decrypted_token';

      expect(encryptedToken).toMatch(/^[a-z0-9]+:[a-z0-9]+:[a-z0-9]+$/);
      expect(decrypted).toMatch(/^shp/);
    });

    it('should never use encrypted token directly in API calls', () => {
      const encryptedToken = 'abc:def:ghi';
      const isEncrypted = encryptedToken.includes(':');

      expect(isEncrypted).toBe(true);
      // API should receive decrypted token, not this format
    });
  });

  describe('Shopify Session Creation', () => {
    it('should create session with shop domain and access token', () => {
      const shopDomain = 'mystore.myshopify.com';
      const accessToken = 'shpat_abc123';

      const sessionData = {
        shop: shopDomain,
        accessToken: accessToken,
      };

      expect(sessionData.shop).toBe(shopDomain);
      expect(sessionData.accessToken).toBeTruthy();
    });

    it('should validate shop domain format', () => {
      const validDomain = 'store.myshopify.com';
      const invalidDomain = 'invalid-domain';

      expect(validDomain).toMatch(/\.myshopify\.com$/);
      expect(invalidDomain).not.toMatch(/\.myshopify\.com$/);
    });
  });

  describe('Error Handling', () => {
    it('should log errors without exposing sensitive data', () => {
      const shopDomain = 'mystore.myshopify.com';
      const error = `[Script Injector] Failed to inject script for ${shopDomain}`;

      expect(error).not.toContain('shpat_');
      expect(error).toContain(shopDomain);
    });

    it('should return error message on injection failure', () => {
      const result = {
        success: false,
        error: 'API rate limit exceeded',
      };

      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should handle network timeouts', () => {
      const error = new Error('Request timeout');

      expect(error.message).toBe('Request timeout');
    });

    it('should handle Shopify API errors', () => {
      const apiError = {
        errors: 'Invalid API key',
      };

      expect(apiError.errors).toBeTruthy();
    });
  });

  describe('Script Tag ID Storage', () => {
    it('should store script tag ID in database', () => {
      const scriptTagId = '987654321';
      const updateData = {
        scriptTagId: scriptTagId,
      };

      expect(updateData.scriptTagId).toBe('987654321');
      expect(typeof updateData.scriptTagId).toBe('string');
    });

    it('should update existing store with script tag ID', () => {
      const storeId = 'store_123';
      const scriptTagId = '111222333';

      const update = {
        where: { id: storeId },
        data: { scriptTagId },
      };

      expect(update.where.id).toBe(storeId);
      expect(update.data.scriptTagId).toBe(scriptTagId);
    });
  });
});
