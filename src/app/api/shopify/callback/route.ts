/**
 * Shopify OAuth Callback Endpoint
 *
 * Handles OAuth callback from Shopify after merchant approves app installation
 * Validates request, exchanges code for access token, stores in database, injects tracking script
 */

import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { injectTrackingScript } from '@/services/shopify/script-injector';
import { encrypt } from '@/lib/encryption';
import { randomBytes } from 'crypto';

/**
 * GET /api/shopify/callback?code=...&hmac=...&shop=...&timestamp=...
 *
 * OAuth callback handler:
 * 1. Validates HMAC signature
 * 2. Exchanges authorization code for access token
 * 3. Stores shop and token in database
 * 4. Associates with Business or creates new one
 * 5. Injects tracking script
 * 6. Redirects to dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const hmac = searchParams.get('hmac');
    const shop = searchParams.get('shop');
    const timestamp = searchParams.get('timestamp');

    // Validate required parameters
    if (!code || !hmac || !shop || !timestamp) {
      console.error('[OAuth Callback] Missing required parameters');
      return NextResponse.json(
        { error: 'Invalid OAuth callback. Missing required parameters.' },
        { status: 400 }
      );
    }

    console.log(`[OAuth Callback] Received callback for shop: ${shop}`);

    // Begin OAuth flow with Shopify
    const callbackResult = await shopify.auth.callback({
      rawRequest: req as any,
    });

    if (!callbackResult.session) {
      console.error('[OAuth Callback] OAuth callback validation failed');
      return NextResponse.json({ error: 'Invalid OAuth callback' }, { status: 401 });
    }

    const { session } = callbackResult;
    const accessToken = session.accessToken!;

    console.log(`[OAuth Callback] Successfully obtained access token for ${shop}`);

    // Check if store already exists
    let shopifyStore = await prisma.shopifyStore.findUnique({
      where: { shopDomain: shop },
      include: { business: true },
    });

    let businessId: string;
    let siteId: string;

    if (shopifyStore) {
      // Existing store - update access token and mark as reinstalled
      console.log(`[OAuth Callback] Store ${shop} already exists, updating...`);

      shopifyStore = await prisma.shopifyStore.update({
        where: { shopDomain: shop },
        data: {
          accessToken: encrypt(accessToken),
          installedAt: new Date(),
          uninstalledAt: null, // Clear uninstall timestamp (re-installation)
        },
        include: { business: true },
      });

      businessId = shopifyStore.businessId;
      siteId = shopifyStore.business.siteId;
    } else {
      // New store - create Business and ShopifyStore
      console.log(`[OAuth Callback] Creating new Business and ShopifyStore for ${shop}`);

      // Generate unique siteId for tracking
      siteId = `shopify_${randomBytes(8).toString('hex')}`;

      // Determine userId: use authenticated user if available, otherwise create unclaimed placeholder
      let userId: string;
      try {
        const session = await auth();
        if (session?.user?.id) {
          userId = session.user.id;
          console.log(`[OAuth Callback] Associating store with authenticated user: ${userId}`);
        } else {
          // No authenticated user - create unclaimed user ID
          // This store can be claimed later by a user through the dashboard
          userId = `unclaimed-${randomBytes(8).toString('hex')}`;
          console.log(`[OAuth Callback] No authenticated user, creating unclaimed store: ${userId}`);
        }
      } catch (error) {
        // Auth failed - use unclaimed user ID
        userId = `unclaimed-${randomBytes(8).toString('hex')}`;
        console.log(`[OAuth Callback] Auth check failed, creating unclaimed store: ${userId}`);
      }

      // Create Business first (required for ShopifyStore relation)
      const business = await prisma.business.create({
        data: {
          userId,
          name: shop.replace('.myshopify.com', ''),
          industry: 'E-commerce',
          revenueRange: 'Unknown',
          productTypes: ['Physical Products'], // Default assumption for Shopify
          platform: 'Shopify',
          siteId,
        },
      });

      businessId = business.id;

      // Create ShopifyStore
      shopifyStore = await prisma.shopifyStore.create({
        data: {
          businessId,
          shopDomain: shop,
          accessToken: encrypt(accessToken),
        },
        include: { business: true },
      });

      console.log(`[OAuth Callback] Created Business ${businessId} and ShopifyStore for ${shop}`);
    }

    // Inject tracking script into Shopify theme
    console.log(`[OAuth Callback] Injecting tracking script for ${shop} with siteId: ${siteId}`);

    const scriptResult = await injectTrackingScript(shop, accessToken, siteId);

    if (scriptResult.success && scriptResult.scriptTagId) {
      // Update ShopifyStore with script tag ID for later removal
      await prisma.shopifyStore.update({
        where: { id: shopifyStore.id },
        data: { scriptTagId: scriptResult.scriptTagId },
      });

      console.log(`[OAuth Callback] Successfully injected script tag ${scriptResult.scriptTagId} for ${shop}`);
    } else {
      console.error(`[OAuth Callback] Failed to inject tracking script for ${shop}:`, scriptResult.error);
      // Continue despite script injection failure (can be retried later)
    }

    // Redirect to dashboard or onboarding
    const redirectUrl = `${process.env.NEXTAUTH_URL}/dashboard?shopify_install=success&shop=${encodeURIComponent(shop)}`;

    console.log(`[OAuth Callback] Installation complete for ${shop}, redirecting to dashboard`);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('[OAuth Callback] Error processing OAuth callback:', error);

    return NextResponse.json(
      {
        error: 'Failed to complete Shopify installation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
