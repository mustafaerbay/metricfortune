/**
 * Weekly Digest Inngest Scheduled Function
 * Story 2.7: Email Notifications & Digests
 *
 * Sends weekly digest emails every Monday at 8am UTC to users who have
 * weekly digest notifications enabled and have new recommendations.
 */

import 'server-only';
import { inngest } from '@/lib/inngest';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { differenceInDays, subDays } from 'date-fns';
import { WeeklyDigestEmail } from '@/emails/weekly-digest';
import type { DigestRecommendation } from '@/emails/weekly-digest';

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

/**
 * Fetch top 2-3 NEW recommendations for a business sorted by impact level
 */
async function getTopNewRecommendations(
  businessId: string
): Promise<DigestRecommendation[]> {
  const IMPACT_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  const recs = await prisma.recommendation.findMany({
    where: {
      businessId,
      status: 'NEW',
    },
    select: {
      id: true,
      title: true,
      problemStatement: true,
      impactLevel: true,
    },
    take: 10, // fetch more, then sort and slice
  });

  return recs
    .sort((a, b) => IMPACT_ORDER[a.impactLevel] - IMPACT_ORDER[b.impactLevel])
    .slice(0, 3)
    .map((rec) => ({
      id: rec.id,
      title: rec.title,
      summary: rec.problemStatement,
      impactLevel: rec.impactLevel,
      dashboardUrl: `${APP_URL}/dashboard/recommendations?rec=${rec.id}`,
    }));
}

/**
 * Fetch this-week vs last-week conversion rate for a site
 */
async function getConversionTrend(
  siteId: string
): Promise<{ thisWeek: number; lastWeek: number; change: number } | null> {
  try {
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const twoWeeksAgo = subDays(now, 14);

    const [thisWeekSessions, lastWeekSessions] = await Promise.all([
      prisma.session.findMany({
        where: { siteId, createdAt: { gte: weekAgo, lt: now } },
        select: { converted: true },
      }),
      prisma.session.findMany({
        where: { siteId, createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
        select: { converted: true },
      }),
    ]);

    if (thisWeekSessions.length === 0 && lastWeekSessions.length === 0) {
      return null;
    }

    const calcRate = (sessions: { converted: boolean }[]): number => {
      if (sessions.length === 0) return 0;
      return (sessions.filter((s) => s.converted).length / sessions.length) * 100;
    };

    const thisWeek = calcRate(thisWeekSessions);
    const lastWeek = calcRate(lastWeekSessions);
    const change = thisWeek - lastWeek;

    return { thisWeek, lastWeek, change };
  } catch {
    return null;
  }
}

/**
 * Fetch positive implementation wins from the last 7 days
 */
async function getImplementationWins(
  businessId: string,
  siteId: string
): Promise<{ title: string; improvement: string }[]> {
  const weekAgo = subDays(new Date(), 7);

  const implemented = await prisma.recommendation.findMany({
    where: {
      businessId,
      status: 'IMPLEMENTED',
      implementedAt: { gte: weekAgo },
    },
    select: { title: true, expectedImpact: true },
    take: 3,
  });

  // For wins, use expectedImpact as the improvement indicator
  // Only include if implemented recently (Story 2.6 data)
  const wins = await Promise.all(
    implemented.map(async (rec) => {
      // Check if there's a positive conversion trend post-implementation
      const trend = await getConversionTrend(siteId);
      if (trend && trend.change > 0) {
        return {
          title: rec.title,
          improvement: `+${trend.change.toFixed(1)}% conversion rate`,
        };
      }
      return null;
    })
  );

  return wins.filter((w): w is { title: string; improvement: string } => w !== null);
}

export const weeklyDigestJob = inngest.createFunction(
  {
    id: 'weekly-digest',
    name: 'Weekly Digest Email',
    retries: 3,
  },
  { cron: '0 8 * * 1' }, // Every Monday at 8am UTC
  async ({ step, logger }) => {
    const startTime = Date.now();

    logger.info('[WeeklyDigest] Job started');

    // Step 1: Fetch eligible users
    const users = await step.run('fetch-eligible-users', async () => {
      return prisma.user.findMany({
        where: {
          emailNotificationsEnabled: true,
          emailDigestFrequency: 'weekly',
          emailVerified: true,
        },
        include: { business: true },
      });
    });

    logger.info(`[WeeklyDigest] Found ${users.length} eligible users`);

    if (users.length === 0) {
      return { status: 'success', sent: 0, skipped: 0, executionTimeMs: Date.now() - startTime };
    }

    let sent = 0;
    let skipped = 0;

    // Step 2: Process each user individually for per-user retries
    for (const user of users) {
      const result = await step.run(`send-digest-${user.id}`, async () => {
        // Idempotency: skip if sent within last 6 days
        if (user.lastDigestSentAt) {
          const daysSince = differenceInDays(new Date(), user.lastDigestSentAt);
          if (daysSince < 6) {
            logger.info(`[WeeklyDigest] Skipping user ${user.id} — sent ${daysSince} days ago`);
            return { skipped: true, reason: 'recently-sent' };
          }
        }

        // Skip if user has no business
        if (!user.business) {
          return { skipped: true, reason: 'no-business' };
        }

        const recommendations = await getTopNewRecommendations(user.business.id);

        if (recommendations.length === 0) {
          return { skipped: true, reason: 'no-new-recommendations' };
        }

        const [conversionTrend, implementationWins] = await Promise.all([
          getConversionTrend(user.business.siteId),
          getImplementationWins(user.business.id, user.business.siteId),
        ]);

        const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${user.emailUnsubscribeToken}`;

        await resend.emails.send({
          from: 'MetricFortune Insights <insights@metricfortune.app>',
          to: user.email,
          subject: `Your ${recommendations.length} optimization ${recommendations.length === 1 ? 'opportunity' : 'opportunities'} this week`,
          react: WeeklyDigestEmail({
            userName: user.email.split('@')[0],
            businessName: user.business.name,
            recommendations,
            conversionTrend,
            implementationWins,
            unsubscribeUrl,
          }),
        });

        // Update lastDigestSentAt
        await prisma.user.update({
          where: { id: user.id },
          data: { lastDigestSentAt: new Date() },
        });

        return { skipped: false };
      });

      if (result.skipped) {
        skipped++;
      } else {
        sent++;
      }
    }

    logger.info(`[WeeklyDigest] Completed: ${sent} sent, ${skipped} skipped`);

    return {
      status: 'success',
      sent,
      skipped,
      executionTimeMs: Date.now() - startTime,
    };
  }
);
