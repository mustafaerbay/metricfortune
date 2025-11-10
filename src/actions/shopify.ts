/**
 * Shopify Integration Server Actions
 *
 * Server-side actions for managing Shopify store connections and operations
 * Uses ActionResult<T> response format for consistency
 */

'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { injectTrackingScript, removeTrackingScript } from '@/services/shopify/script-injector';
import { syncOrderData, getOrderCount } from '@/services/shopify/data-sync';
import type { ShopifyStore } from '@prisma/client';
import { z } from 'zod';

/**
 * Action result type for consistent response handling
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Input validation schemas
 */
const BusinessIdSchema = z.string().cuid('Invalid business ID format');
const DaysBackSchema = z.number().int().positive().max(365, 'Days back must be between 1 and 365');

/**
 * Get Shopify store connection for a business
 *
 * @param businessId - Business ID to lookup
 * @returns Shopify store data or null if not connected
 */
export async function getShopifyStore(
  businessId: string
): Promise<ActionResult<ShopifyStore | null>> {
  try {
    // Validate input
    const validationResult = BusinessIdSchema.safeParse(businessId);
    if (!validationResult.success) {
      return { success: false, error: validationResult.error.issues[0].message };
    }

    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate business ownership
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { userId: true },
    });

    if (!business) {
      return { success: false, error: 'Business not found' };
    }

    if (business.userId !== session.user.id) {
      return { success: false, error: 'Not authorized to access this business' };
    }

    // Fetch Shopify store
    const shopifyStore = await prisma.shopifyStore.findUnique({
      where: { businessId },
    });

    return { success: true, data: shopifyStore };
  } catch (error) {
    console.error('[Shopify Actions] Error fetching Shopify store:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Shopify store',
    };
  }
}

/**
 * Reinstall tracking script for a Shopify store
 *
 * Useful if script was accidentally removed or needs to be re-injected
 *
 * @param businessId - Business ID
 * @returns Success result or error
 */
export async function reinstallTrackingScript(
  businessId: string
): Promise<ActionResult<void>> {
  try {
    // Validate input
    const validationResult = BusinessIdSchema.safeParse(businessId);
    if (!validationResult.success) {
      return { success: false, error: validationResult.error.issues[0].message };
    }

    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate business ownership
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { userId: true, siteId: true },
    });

    if (!business) {
      return { success: false, error: 'Business not found' };
    }

    if (business.userId !== session.user.id) {
      return { success: false, error: 'Not authorized to access this business' };
    }

    // Fetch Shopify store
    const shopifyStore = await prisma.shopifyStore.findUnique({
      where: { businessId },
    });

    if (!shopifyStore) {
      return { success: false, error: 'Shopify store not connected' };
    }

    if (shopifyStore.uninstalledAt) {
      return { success: false, error: 'Shopify app has been uninstalled. Please reinstall from Shopify.' };
    }

    // Inject tracking script (decrypt access token first)
    const decryptedToken = decrypt(shopifyStore.accessToken);
    const result = await injectTrackingScript(
      shopifyStore.shopDomain,
      decryptedToken,
      business.siteId
    );

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to inject tracking script' };
    }

    // Update script tag ID
    if (result.scriptTagId) {
      await prisma.shopifyStore.update({
        where: { id: shopifyStore.id },
        data: { scriptTagId: result.scriptTagId },
      });
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error('[Shopify Actions] Error reinstalling tracking script:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reinstall tracking script',
    };
  }
}

/**
 * Disconnect Shopify store from business
 *
 * Removes tracking script and marks store as uninstalled
 *
 * @param businessId - Business ID
 * @returns Success result or error
 */
export async function disconnectShopifyStore(
  businessId: string
): Promise<ActionResult<void>> {
  try {
    // Validate input
    const validationResult = BusinessIdSchema.safeParse(businessId);
    if (!validationResult.success) {
      return { success: false, error: validationResult.error.issues[0].message };
    }

    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate business ownership
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { userId: true },
    });

    if (!business) {
      return { success: false, error: 'Business not found' };
    }

    if (business.userId !== session.user.id) {
      return { success: false, error: 'Not authorized to access this business' };
    }

    // Fetch Shopify store
    const shopifyStore = await prisma.shopifyStore.findUnique({
      where: { businessId },
    });

    if (!shopifyStore) {
      return { success: false, error: 'Shopify store not connected' };
    }

    // Remove tracking script (decrypt access token first)
    if (shopifyStore.scriptTagId) {
      const decryptedToken = decrypt(shopifyStore.accessToken);
      await removeTrackingScript(
        shopifyStore.shopDomain,
        decryptedToken,
        shopifyStore.scriptTagId
      );
    }

    // Mark as uninstalled
    await prisma.shopifyStore.update({
      where: { id: shopifyStore.id },
      data: { uninstalledAt: new Date() },
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error('[Shopify Actions] Error disconnecting Shopify store:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect Shopify store',
    };
  }
}

/**
 * Manually trigger order sync for a Shopify store
 *
 * Syncs orders from last 7 days
 *
 * @param businessId - Business ID
 * @returns Sync result with order count
 */
export async function syncShopifyOrders(
  businessId: string,
  daysBack: number = 7
): Promise<ActionResult<{ ordersSynced: number; executionTime: number }>> {
  try {
    // Validate inputs
    const businessIdValidation = BusinessIdSchema.safeParse(businessId);
    if (!businessIdValidation.success) {
      return { success: false, error: businessIdValidation.error.issues[0].message };
    }

    const daysBackValidation = DaysBackSchema.safeParse(daysBack);
    if (!daysBackValidation.success) {
      return { success: false, error: daysBackValidation.error.issues[0].message };
    }

    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate business ownership
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { userId: true },
    });

    if (!business) {
      return { success: false, error: 'Business not found' };
    }

    if (business.userId !== session.user.id) {
      return { success: false, error: 'Not authorized to access this business' };
    }

    // Fetch Shopify store
    const shopifyStore = await prisma.shopifyStore.findUnique({
      where: { businessId },
    });

    if (!shopifyStore) {
      return { success: false, error: 'Shopify store not connected' };
    }

    if (shopifyStore.uninstalledAt) {
      return { success: false, error: 'Shopify app has been uninstalled. Please reinstall from Shopify.' };
    }

    // Sync orders (decrypt access token first)
    const decryptedToken = decrypt(shopifyStore.accessToken);
    const result = await syncOrderData(
      shopifyStore.id,
      shopifyStore.shopDomain,
      decryptedToken,
      daysBack
    );

    if (!result.success) {
      return { success: false, error: 'Failed to sync orders' };
    }

    return {
      success: true,
      data: {
        ordersSynced: result.ordersSynced,
        executionTime: result.executionTime,
      },
    };
  } catch (error) {
    console.error('[Shopify Actions] Error syncing Shopify orders:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync Shopify orders',
    };
  }
}

/**
 * Get Shopify order statistics for a business
 *
 * @param businessId - Business ID
 * @returns Order count or error
 */
export async function getShopifyOrderStats(
  businessId: string
): Promise<ActionResult<{ orderCount: number }>> {
  try {
    // Validate input
    const validationResult = BusinessIdSchema.safeParse(businessId);
    if (!validationResult.success) {
      return { success: false, error: validationResult.error.issues[0].message };
    }

    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate business ownership
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { userId: true },
    });

    if (!business) {
      return { success: false, error: 'Business not found' };
    }

    if (business.userId !== session.user.id) {
      return { success: false, error: 'Not authorized to access this business' };
    }

    // Fetch Shopify store
    const shopifyStore = await prisma.shopifyStore.findUnique({
      where: { businessId },
    });

    if (!shopifyStore) {
      return { success: false, error: 'Shopify store not connected' };
    }

    // Get order count
    const orderCount = await getOrderCount(shopifyStore.id);

    return {
      success: true,
      data: { orderCount },
    };
  } catch (error) {
    console.error('[Shopify Actions] Error fetching Shopify order stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch order stats',
    };
  }
}
