/**
 * Shopify OAuth Install Endpoint
 *
 * Initiates OAuth flow by redirecting to Shopify authorization page
 * Merchants land here when clicking "Install MetricFortune" from Shopify App Store
 */

import { NextRequest, NextResponse } from 'next/server';
import { shopify, isValidShopDomain, sanitizeShopDomain } from '@/lib/shopify';

/**
 * GET /api/shopify/install?shop=mystore.myshopify.com
 *
 * Validates shop domain and redirects to Shopify OAuth authorization page
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawShop = searchParams.get('shop');

    // Validate shop parameter
    if (!rawShop) {
      return NextResponse.json(
        { error: 'Missing shop parameter. Please provide your Shopify store domain.' },
        { status: 400 }
      );
    }

    // Sanitize and validate shop domain
    const shop = sanitizeShopDomain(rawShop);

    if (!isValidShopDomain(shop)) {
      return NextResponse.json(
        { error: 'Invalid shop domain. Must be a valid .myshopify.com domain.' },
        { status: 400 }
      );
    }

    console.log(`[OAuth Install] Initiating OAuth flow for shop: ${shop}`);

    // Generate OAuth authorization URL
    // Shopify will redirect back to /api/shopify/callback after user approves
    const authRouteResult = await shopify.auth.begin({
      shop,
      callbackPath: '/api/shopify/callback',
      isOnline: false, // Offline access token (persists across sessions)
      rawRequest: req as any,
    });

    console.log(`[OAuth Install] Redirecting to Shopify authorization`);

    // Redirect merchant to Shopify authorization page
    // Extract redirect URL from headers
    const redirectUrl = authRouteResult.headers?.get?.('location') || authRouteResult as any as string;
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('[OAuth Install] Error initiating OAuth flow:', error);

    return NextResponse.json(
      {
        error: 'Failed to initiate Shopify installation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
