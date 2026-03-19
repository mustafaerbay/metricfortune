import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { triggerSessionAggregation } from '@/inngest/session-aggregation';
import { aggregateSessions, createSessions } from '@/services/analytics/session-aggregator';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/trigger-session-aggregation
 *
 * Manually triggers session aggregation job for testing/admin purposes.
 * Requires authenticated user.
 *
 * This bypasses the 4-hour cron schedule and immediately processes
 * tracking events into sessions.
 */
export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    console.log(
      `[Admin] Manually triggering session aggregation by user: ${session.user.email}`
    );

    // Check for ?direct=true to bypass Inngest and run synchronously
    const url = new URL(request.url);
    const direct = url.searchParams.get('direct') === 'true';

    if (direct) {
      // Run aggregation directly without Inngest (useful when Inngest dev server is not running)
      const endTime = new Date();

      // Find earliest unprocessed event (same logic as Inngest job)
      const latestSession = await prisma.session.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      let startTime: Date;
      if (latestSession) {
        startTime = latestSession.createdAt;
      } else {
        const earliest = await prisma.trackingEvent.findFirst({
          orderBy: { timestamp: 'asc' },
          select: { timestamp: true },
        });
        startTime = earliest?.timestamp ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      console.log(`[Admin] Direct aggregation: ${startTime.toISOString()} → ${endTime.toISOString()}`);

      const sessionsData = await aggregateSessions(startTime, endTime);
      const result = await createSessions(sessionsData);

      return NextResponse.json({
        success: true,
        message: 'Direct aggregation completed',
        sessionsProcessed: sessionsData.length,
        sessionsCreated: result.created,
        errors: result.errors,
        range: { from: startTime.toISOString(), to: endTime.toISOString() },
      });
    }

    // Default: trigger via Inngest
    const result = await triggerSessionAggregation();

    return NextResponse.json({
      success: true,
      message: 'Session aggregation job triggered successfully',
      jobId: result.ids[0],
      note: 'Check Inngest dashboard or server logs for progress',
    });
  } catch (error) {
    console.error('[Admin] Error triggering session aggregation:', error);

    return NextResponse.json(
      {
        error: 'Failed to trigger session aggregation',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/trigger-session-aggregation
 *
 * Returns info about the session aggregation job
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    info: 'Session Aggregation Job',
    schedule: 'Every 4 hours (cron: 0 */4 * * *)',
    trigger: {
      method: 'POST',
      endpoint: '/api/admin/trigger-session-aggregation',
      description: 'Manually trigger session aggregation on-demand',
    },
    curl: `curl -X POST ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/trigger-session-aggregation -H "Cookie: [your-session-cookie]"`,
  });
}
