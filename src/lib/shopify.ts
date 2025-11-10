/**
 * Shopify API Configuration
 *
 * Initializes Shopify API client for OAuth flow and Admin API operations
 */

import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion } from '@shopify/shopify-api';

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
export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: ['read_orders', 'read_products', 'write_script_tags'],
  hostName,
  apiVersion: ApiVersion.October24, // Use October 2024 API version (stable)
  isEmbeddedApp: false, // MetricFortune is a standalone app, not embedded in Shopify Admin
  isPrivateApp: false,
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
  const session = shopify.session.customAppSession(shopDomain);
  session.accessToken = accessToken;
  return session;
}
