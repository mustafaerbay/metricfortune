/**
 * Shopify API Configuration
 *
 * Initializes Shopify API client for OAuth flow and Admin API operations
 */

import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion, Shopify } from '@shopify/shopify-api';

let shopifyInstance: Shopify | null = null;

/**
 * Get Shopify API client singleton (lazy initialization)
 *
 * This is initialized lazily to avoid requiring environment variables during build time.
 * The variables are only validated when the Shopify API is actually used at runtime.
 */
export function getShopify(): Shopify {
  if (shopifyInstance) {
    return shopifyInstance;
  }

  // Validate environment variables at runtime
  if (!process.env.SHOPIFY_API_KEY) {
    throw new Error('SHOPIFY_API_KEY environment variable is not set');
  }

  if (!process.env.SHOPIFY_API_SECRET) {
    throw new Error('SHOPIFY_API_SECRET environment variable is not set');
  }

  if (!process.env.NEXTAUTH_URL) {
    throw new Error('NEXTAUTH_URL environment variable is not set');
  }

  // Extract hostname from NEXTAUTH_URL for Shopify API configuration
  const hostName = process.env.NEXTAUTH_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');

  /**
   * Shopify API client singleton
   *
   * Configured with:
   * - API credentials from environment variables
   * - Required scopes: read_orders, read_products, write_script_tags
   * - OAuth redirect handling
   */
  shopifyInstance = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: ['read_orders', 'read_products', 'write_script_tags'],
    hostName,
    apiVersion: ApiVersion.October24, // Use October 2024 API version (stable)
    isEmbeddedApp: false, // MetricFortune is a standalone app, not embedded in Shopify Admin
    isPrivateApp: false,
  });

  return shopifyInstance;
}

/**
 * Legacy export for backwards compatibility
 * @deprecated Use getShopify() instead
 */
export const shopify = new Proxy({} as Shopify, {
  get(target, prop) {
    return getShopify()[prop as keyof Shopify];
  }
});

/**
 * Helper to validate shop domain format
 *
 * @param shop - Shop domain to validate
 * @returns true if valid Shopify domain
 */
export function isValidShopDomain(shop: string): boolean {
  const shopDomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
  return shopDomainRegex.test(shop);
}

/**
 * Helper to sanitize shop domain (ensure .myshopify.com format)
 *
 * @param shop - Raw shop input from user
 * @returns Sanitized shop domain
 */
export function sanitizeShopDomain(shop: string): string {
  const cleaned = shop.trim().toLowerCase();

  // If already includes .myshopify.com, validate and return
  if (cleaned.includes('.myshopify.com')) {
    return cleaned;
  }

  // Otherwise, append .myshopify.com
  return `${cleaned}.myshopify.com`;
}

/**
 * Create a Shopify session for Admin API operations
 *
 * @param shopDomain - Shop domain (e.g., "mystore.myshopify.com")
 * @param accessToken - OAuth access token for the shop
 * @returns Shopify session object
 */
export function createShopifySession(shopDomain: string, accessToken: string) {
  const shopifyClient = getShopify();
  const session = shopifyClient.session.customAppSession(shopDomain);
  session.accessToken = accessToken;
  return session;
}
