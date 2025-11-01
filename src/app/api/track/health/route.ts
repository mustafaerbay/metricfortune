/**
 * GET /api/track/health - Health Check Endpoint
 *
 * Provides health status for the tracking system:
 * - Database connectivity
 * - Event buffer status
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBufferSize } from '@/services/tracking/event-processor';
import type { ApiResponse } from '@/types/tracking';

/**
 * Configure route runtime
 * For local development, use Node.js runtime (default)
 * For production with Prisma Accelerate: export const runtime = 'edge';
 */
// export const runtime = 'edge'; // Uncomment for production

/**
 * Health check response data
 */
interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: {
      status: 'ok' | 'error';
      responseTimeMs?: number;
      error?: string;
    };
    eventBuffer: {
      status: 'ok' | 'warning';
      size: number;
    };
  };
}

/**
 * Handle GET request - health check
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connectivity
    const dbStartTime = Date.now();
    let dbStatus: 'ok' | 'error' = 'ok';
    let dbError: string | undefined;
    let dbResponseTime: number | undefined;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbResponseTime = Date.now() - dbStartTime;
    } catch (error) {
      dbStatus = 'error';
      dbError = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TrackHealth] Database check failed:', error);
    }

    // Check event buffer size
    const bufferSize = getBufferSize();
    const bufferStatus = bufferSize > 50 ? 'warning' : 'ok';

    // Determine overall health status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (dbStatus === 'error') {
      overallStatus = 'unhealthy';
    } else if (bufferStatus === 'warning') {
      overallStatus = 'degraded';
    }

    // Build health response
    const healthData: HealthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbStatus,
          responseTimeMs: dbResponseTime,
          error: dbError,
        },
        eventBuffer: {
          status: bufferStatus,
          size: bufferSize,
        },
      },
    };

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    console.log('[TrackHealth] Health check:', {
      status: overallStatus,
      checkTimeMs: Date.now() - startTime,
      bufferSize,
    });

    return NextResponse.json<ApiResponse<HealthData>>(
      {
        success: true,
        data: healthData,
      },
      { status: statusCode }
    );
  } catch (error) {
    console.error('[TrackHealth] Unexpected error:', error);

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}
