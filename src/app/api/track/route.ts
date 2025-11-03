/**
 * POST /api/track - Tracking Event Ingestion Endpoint
 *
 * Accepts tracking events from the MetricFortune tracking script.
 * Implements:
 * - Schema validation (Zod)
 * - Rate limiting (per-site)
 * - Authentication (siteId validation)
 * - Event buffering and batch writes
 * - Monitoring and error logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { trackingEventBatchSchema, type ApiResponse } from '@/types/tracking';
import { processTrackingEvents } from '@/services/tracking/event-processor';
import { checkRateLimit } from '@/lib/rate-limiter';
import { prisma } from '@/lib/prisma';

/**
 * Configure route runtime
 *
 * For production with Prisma Accelerate or Driver Adapters:
 * export const runtime = 'edge';
 *
 * For local development with direct database connection:
 * Use Node.js runtime (default)
 */
export const runtime = 'edge'; // Uncomment for production with Prisma Accelerate

/**
 * Enable CORS for tracking endpoint (cross-origin requests)
 *
 * PRODUCTION NOTE: Replace '*' with specific allowed origins for better security:
 * - Use environment variable for dynamic origin configuration
 * - Example: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
 * - Implement origin validation in the request handler
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: Restrict in production
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Handle OPTIONS request for CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Handle POST request - track events
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();

    // Validate request schema
    const validationResult = trackingEventBatchSchema.safeParse(body);

    if (!validationResult.success) {
      // Format validation errors for response
      const errorMessage = validationResult.error.message || 'Invalid request format';

      console.warn('[TrackAPI] Validation failed:', errorMessage);

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Validation failed: ${errorMessage}`,
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const { events } = validationResult.data;

    // Extract siteId from first event (all events in batch should have same siteId)
    const siteId = events[0].siteId;

    // Authentication: Validate siteId exists in Business table
    const business = await prisma.business.findUnique({
      where: { siteId },
      select: { siteId: true },
    });

    if (!business) {
      console.warn('[TrackAPI] Invalid siteId:', siteId);

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid siteId',
        },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    // Rate limiting: Check per-site limits (1000 events/minute)
    const rateLimitResult = checkRateLimit(`track:${siteId}`);

    // Add rate limit headers
    const responseHeaders = {
      ...corsHeaders,
      'X-RateLimit-Limit': rateLimitResult.limit.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
    };

    if (!rateLimitResult.allowed) {
      console.warn('[TrackAPI] Rate limit exceeded:', siteId);

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Rate limit exceeded',
        },
        {
          status: 429,
          headers: responseHeaders,
        }
      );
    }

    // Process events (buffered batch write)
    const processResult = await processTrackingEvents(events);

    if (!processResult.success) {
      console.error('[TrackAPI] Processing failed:', {
        siteId,
        eventCount: events.length,
        error: processResult.error,
      });

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Failed to process events',
        },
        {
          status: 500,
          headers: responseHeaders,
        }
      );
    }

    // Log successful processing
    const processingTime = Date.now() - startTime;
    console.log('[TrackAPI] Events processed:', {
      siteId,
      eventCount: events.length,
      processingTimeMs: processingTime,
      buffered: processResult.buffered,
    });

    return NextResponse.json<ApiResponse>(
      { success: true },
      {
        status: 200,
        headers: responseHeaders,
      }
    );
  } catch (error) {
    // Handle unexpected errors
    const processingTime = Date.now() - startTime;

    if (error instanceof ZodError) {
      console.warn('[TrackAPI] Zod validation error:', error.message);

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Invalid request format',
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Log error for monitoring (avoid exposing sensitive details in production)
    if (process.env.NODE_ENV === 'development') {
      console.error('[TrackAPI] Unexpected error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
      });
    } else {
      console.error('[TrackAPI] Unexpected error occurred', {
        processingTimeMs: processingTime,
      });
    }

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Internal server error',
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
