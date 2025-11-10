/**
 * Shopify Script Injection Service
 *
 * Handles tracking script injection and removal via Shopify Admin API ScriptTag resource
 */

import { shopify, createShopifySession } from '@/lib/shopify';
import type { ScriptInjectionResult, ShopifyScriptTag } from '@/types/shopify';

/**
 * Inject MetricFortune tracking script into Shopify store
 *
 * Creates a ScriptTag resource that loads tracking.js on all storefront pages
 *
 * @param shopDomain - Shop domain (e.g., "mystore.myshopify.com")
 * @param accessToken - OAuth access token for the shop
 * @param siteId - MetricFortune site ID for tracking identification
 * @returns Result with scriptTagId if successful, or error message
 */
export async function injectTrackingScript(
  shopDomain: string,
  accessToken: string,
  siteId: string
): Promise<ScriptInjectionResult> {
  try {
    console.log(`[Script Injector] Injecting tracking script for shop: ${shopDomain}, siteId: ${siteId}`);

    // Create Shopify session for API calls
    const session = createShopifySession(shopDomain, accessToken);
    const client = new shopify.clients.Rest({ session });

    // Construct tracking script URL with siteId query parameter
    const scriptUrl = `${process.env.NEXTAUTH_URL}/tracking.js?siteId=${siteId}`;

    // Check if script tag already exists to prevent duplicates
    const existingScriptTags = await client.get({
      path: 'script_tags',
    });

    const existingTag = (existingScriptTags.body as { script_tags: ShopifyScriptTag[] }).script_tags.find(
      (tag) => tag.src === scriptUrl
    );

    if (existingTag) {
      console.log(`[Script Injector] Script tag already exists for ${shopDomain}: ${existingTag.id}`);
      return {
        success: true,
        scriptTagId: existingTag.id.toString(),
      };
    }

    // Create new script tag
    const response = await client.post({
      path: 'script_tags',
      data: {
        script_tag: {
          event: 'onload',
          src: scriptUrl,
          display_scope: 'all', // Load on all pages (storefront + order status)
        },
      },
    });

    const scriptTag = (response.body as { script_tag: ShopifyScriptTag }).script_tag;

    console.log(`[Script Injector] Successfully created script tag ${scriptTag.id} for ${shopDomain}`);

    return {
      success: true,
      scriptTagId: scriptTag.id.toString(),
    };
  } catch (error) {
    console.error(`[Script Injector] Failed to inject script for ${shopDomain}:`, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during script injection',
    };
  }
}

/**
 * Remove MetricFortune tracking script from Shopify store
 *
 * Deletes the ScriptTag resource by ID
 *
 * @param shopDomain - Shop domain (e.g., "mystore.myshopify.com")
 * @param accessToken - OAuth access token for the shop
 * @param scriptTagId - ID of script tag to remove
 * @returns Result indicating success or error
 */
export async function removeTrackingScript(
  shopDomain: string,
  accessToken: string,
  scriptTagId: string
): Promise<ScriptInjectionResult> {
  try {
    console.log(`[Script Injector] Removing script tag ${scriptTagId} from shop: ${shopDomain}`);

    // Create Shopify session for API calls
    const session = createShopifySession(shopDomain, accessToken);
    const client = new shopify.clients.Rest({ session });

    // Delete script tag
    await client.delete({
      path: `script_tags/${scriptTagId}`,
    });

    console.log(`[Script Injector] Successfully removed script tag ${scriptTagId} from ${shopDomain}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error(`[Script Injector] Failed to remove script tag ${scriptTagId} from ${shopDomain}:`, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during script removal',
    };
  }
}

/**
 * Get all script tags for a Shopify store
 *
 * Useful for debugging and verification
 *
 * @param shopDomain - Shop domain (e.g., "mystore.myshopify.com")
 * @param accessToken - OAuth access token for the shop
 * @returns Array of script tags or empty array on error
 */
export async function getScriptTags(
  shopDomain: string,
  accessToken: string
): Promise<ShopifyScriptTag[]> {
  try {
    const session = createShopifySession(shopDomain, accessToken);
    const client = new shopify.clients.Rest({ session });

    const response = await client.get({
      path: 'script_tags',
    });

    return (response.body as { script_tags: ShopifyScriptTag[] }).script_tags;
  } catch (error) {
    console.error(`[Script Injector] Failed to fetch script tags for ${shopDomain}:`, error);
    return [];
  }
}
