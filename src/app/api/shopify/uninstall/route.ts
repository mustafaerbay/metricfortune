/**
 * Shopify Uninstall Webhook Endpoint
 *
 * Handles app/uninstalled webhook from Shopify when merchant uninstalls MetricFortune
 * Validates HMAC signature, marks store as uninstalled, removes tracking script
 */

import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { removeTrackingScript } from '@/services/shopify/script-injector';

/**
 * POST /api/shopify/uninstall
 *
 * Webhook handler for app uninstallation:
 * 1. Validates HMAC signature
 * 2. Marks ShopifyStore.uninstalledAt timestamp
 * 3. Attempts to remove tracking script (may fail if token invalid)
 * 4. Returns 200 OK quickly to prevent Shopify retries
 */
export async function POST(req: NextRequest) {
  try {
    // Get shop domain from webhook headers
    const shopDomain = req.headers.get('x-shopify-shop-domain');

    if (!shopDomain) {
      console.error('[Uninstall Webhook] Missing x-shopify-shop-domain header');
      return NextResponse.json({ error: 'Missing shop domain header' }, { status: 400 });
    }

    console.log(`[Uninstall Webhook] Received uninstall webhook for shop: ${shopDomain}`);

    // Validate HMAC signature
    const rawBody = await req.text();
    const hmac = req.headers.get('x-shopify-hmac-sha256');

    if (!hmac) {
      console.error('[Uninstall Webhook] Missing HMAC signature');
      return NextResponse.json({ error: 'Missing HMAC signature' }, { status: 401 });
    }

    // Verify webhook authenticity
    const verified = await shopify.webhooks.validate({
      rawBody,
      rawRequest: req as any,
    });

    if (!verified) {
      console.error('[Uninstall Webhook] HMAC validation failed for shop:', shopDomain);
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
    }

    console.log(`[Uninstall Webhook] HMAC validation successful for ${shopDomain}`);

    // Find ShopifyStore in database
    const shopifyStore = await prisma.shopifyStore.findUnique({
      where: { shopDomain },
    });

    if (!shopifyStore) {
      console.warn(`[Uninstall Webhook] Store ${shopDomain} not found in database`);
      // Return 200 anyway to acknowledge webhook (avoid retries)
      return NextResponse.json({ success: true, message: 'Store not found' });
    }

    // Mark store as uninstalled
    await prisma.shopifyStore.update({
      where: { shopDomain },
      data: { uninstalledAt: new Date() },
    });

    console.log(`[Uninstall Webhook] Marked store ${shopDomain} as uninstalled`);

    // Attempt to remove tracking script
    // Note: Access token may be invalid at this point (Shopify revokes on uninstall)
    // Shopify also auto-removes script tags, so this is a best-effort cleanup
    if (shopifyStore.scriptTagId) {
      // Decrypt access token before use
      const decryptedToken = decrypt(shopifyStore.accessToken);
      const removeResult = await removeTrackingScript(
        shopDomain,
        decryptedToken,
        shopifyStore.scriptTagId
      );

      if (removeResult.success) {
        console.log(`[Uninstall Webhook] Successfully removed script tag for ${shopDomain}`);
      } else {
        console.warn(
          `[Uninstall Webhook] Failed to remove script tag for ${shopDomain}:`,
          removeResult.error
        );
        // Continue anyway - Shopify removes script tags automatically on uninstall
      }
    }

    // Return 200 OK quickly (Shopify expects response within 5 seconds)
    return NextResponse.json({
      success: true,
      message: 'App uninstalled successfully',
    });
  } catch (error) {
    console.error('[Uninstall Webhook] Error processing uninstall webhook:', error);

    // Still return 200 to prevent Shopify retries
    // Log error for investigation
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 } // Return 200 to acknowledge webhook
    );
  }
}
