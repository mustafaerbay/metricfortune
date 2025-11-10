/**
 * Shopify Order Data Sync - Inngest Scheduled Job
 *
 * Syncs order and product data from all active Shopify stores daily
 * Scheduled to run at 2 AM UTC to minimize impact on production traffic
 */

import { inngest } from '@/lib/inngest';
import { syncAllStores } from '@/services/shopify/data-sync';

/**
 * Daily Shopify order sync job
 *
 * - Runs daily at 2 AM UTC (cron: "0 2 * * *")
 * - Syncs orders from last 7 days for all active stores
 * - Implements rate limiting to respect Shopify API limits
 * - Automatic retries via Inngest on transient failures
 */
export const shopifyDataSyncJob = inngest.createFunction(
  {
    id: 'shopify-data-sync',
    name: 'Sync Shopify Order Data',
    retries: 3, // Retry up to 3 times on failure
  },
  { cron: '0 2 * * *' }, // Daily at 2 AM UTC
  async ({ step }) => {
    console.log('[Inngest] Starting Shopify order data sync job');
    console.time('[Inngest] Shopify Data Sync Execution');

    // Step 1: Sync all stores with order data from last 7 days
    const result = await step.run('sync-all-stores', async () => {
      return await syncAllStores(7); // Last 7 days of orders
    });

    console.timeEnd('[Inngest] Shopify Data Sync Execution');

    // Log results
    console.log('[Inngest] Shopify Data Sync Results:', {
      success: result.success,
      ordersSynced: result.ordersSynced,
      errors: result.errors,
      executionTime: `${result.executionTime}ms`,
    });

    // Return structured result for Inngest dashboard visibility
    return {
      success: result.success,
      ordersSynced: result.ordersSynced,
      errors: result.errors,
      executionTimeMs: result.executionTime,
      timestamp: new Date().toISOString(),
    };
  }
);
