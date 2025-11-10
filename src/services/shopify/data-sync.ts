/**
 * Shopify Order Data Sync Service
 *
 * Handles syncing order and product metadata from Shopify Admin API to PostgreSQL
 */

import { shopify, createShopifySession } from '@/lib/shopify';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import type { ShopifyOrder, OrderSyncResult } from '@/types/shopify';

/**
 * Sync recent orders from Shopify store to database
 *
 * Queries Shopify Orders API for orders from the last 7 days and stores in ShopifyOrder model
 *
 * @param shopifyStoreId - Database ID of ShopifyStore record
 * @param shopDomain - Shop domain (e.g., "mystore.myshopify.com")
 * @param accessToken - OAuth access token for the shop
 * @param daysBack - Number of days to look back for orders (default: 7)
 * @returns Sync result with counts and execution time
 */
export async function syncOrderData(
  shopifyStoreId: string,
  shopDomain: string,
  accessToken: string,
  daysBack: number = 7
): Promise<OrderSyncResult> {
  const startTime = Date.now();
  let ordersSynced = 0;
  let errors = 0;

  try {
    console.log(`[Order Sync] Starting sync for ${shopDomain} (last ${daysBack} days)`);

    // Create Shopify session for API calls
    const session = createShopifySession(shopDomain, accessToken);
    const client = new shopify.clients.Rest({ session });

    // Calculate date range for order query
    const createdAtMin = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    // Fetch orders from Shopify (max 250 per request)
    const response = await client.get({
      path: 'orders',
      query: {
        status: 'any', // Include all order statuses
        created_at_min: createdAtMin.toISOString(),
        limit: '250', // Shopify max limit
      },
    });

    const orders = (response.body as { orders: ShopifyOrder[] }).orders;

    console.log(`[Order Sync] Fetched ${orders.length} orders from Shopify for ${shopDomain}`);

    // Store orders in database (upsert to handle duplicates)
    for (const order of orders) {
      try {
        await prisma.shopifyOrder.upsert({
          where: {
            shopifyOrderId: order.id.toString(),
          },
          create: {
            shopifyStoreId,
            shopifyOrderId: order.id.toString(),
            orderData: order as any, // Store complete order JSON
            total: parseFloat(order.total_price),
            currency: order.currency,
            createdAt: new Date(order.created_at),
          },
          update: {
            orderData: order as any, // Update if order details changed
            total: parseFloat(order.total_price),
            currency: order.currency,
          },
        });

        ordersSynced++;
      } catch (error) {
        console.error(`[Order Sync] Failed to store order ${order.id} for ${shopDomain}:`, error);
        errors++;
      }
    }

    const executionTime = Date.now() - startTime;

    console.log(
      `[Order Sync] Completed sync for ${shopDomain}: ${ordersSynced} orders synced, ${errors} errors, ${executionTime}ms`
    );

    return {
      success: true,
      ordersSynced,
      errors,
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;

    console.error(`[Order Sync] Failed to sync orders for ${shopDomain}:`, error);

    return {
      success: false,
      ordersSynced,
      errors: errors + 1,
      executionTime,
    };
  }
}

/**
 * Sync orders for all active Shopify stores
 *
 * Called by Inngest scheduled job to sync all stores daily
 *
 * @param daysBack - Number of days to look back for orders (default: 7)
 * @returns Aggregate sync result across all stores
 */
export async function syncAllStores(daysBack: number = 7): Promise<OrderSyncResult> {
  const startTime = Date.now();
  let totalOrdersSynced = 0;
  let totalErrors = 0;

  try {
    console.log('[Order Sync] Starting sync for all active Shopify stores');

    // Fetch all active Shopify stores (not uninstalled)
    const stores = await prisma.shopifyStore.findMany({
      where: {
        uninstalledAt: null,
      },
      select: {
        id: true,
        shopDomain: true,
        accessToken: true,
      },
    });

    console.log(`[Order Sync] Found ${stores.length} active Shopify stores to sync`);

    // Sync each store sequentially with rate limiting
    for (const store of stores) {
      // Decrypt access token before use
      const decryptedToken = decrypt(store.accessToken);
      const result = await syncOrderData(store.id, store.shopDomain, decryptedToken, daysBack);

      totalOrdersSynced += result.ordersSynced;
      totalErrors += result.errors;

      // Rate limiting: Shopify allows 2 requests/second sustained
      // Wait 500ms between stores to stay under limit
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const executionTime = Date.now() - startTime;

    console.log(
      `[Order Sync] Completed sync for all stores: ${totalOrdersSynced} orders synced, ${totalErrors} errors, ${executionTime}ms`
    );

    return {
      success: true,
      ordersSynced: totalOrdersSynced,
      errors: totalErrors,
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;

    console.error('[Order Sync] Failed to sync all stores:', error);

    return {
      success: false,
      ordersSynced: totalOrdersSynced,
      errors: totalErrors + 1,
      executionTime,
    };
  }
}

/**
 * Get order count for a Shopify store
 *
 * Useful for analytics and debugging
 *
 * @param shopifyStoreId - Database ID of ShopifyStore record
 * @returns Order count or 0 on error
 */
export async function getOrderCount(shopifyStoreId: string): Promise<number> {
  try {
    return await prisma.shopifyOrder.count({
      where: {
        shopifyStoreId,
      },
    });
  } catch (error) {
    console.error(`[Order Sync] Failed to count orders for store ${shopifyStoreId}:`, error);
    return 0;
  }
}
