import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { subDays } from 'date-fns';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateFunnelStages, generateInsight, calculateJourneyTypeStats } from '@/services/analytics/journey-calculator';
import { JourneyFunnel } from '@/components/dashboard/journey-funnel';
import type { JourneyType } from '@/types/journey';

interface PageProps {
  searchParams: {
    range?: string;
    type?: string;
  };
}

/**
 * Journey Insights Page
 *
 * Displays visual funnel diagrams showing customer journey drop-off points.
 * Server Component that fetches session data and calculates funnel metrics.
 *
 * AC#1: Journey Insights tab displays visual funnel diagram
 * AC#6: Date range selector (Last 7 days, Last 30 days, Last 90 days)
 * AC#7: Plain-language summary above chart
 */
export default async function JourneyInsightsPage({ searchParams }: PageProps) {
  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Get user's business
  const business = await prisma.business.findUnique({
    where: { userId: session.user.id },
    select: { siteId: true, name: true },
  });

  if (!business) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-900">No Business Profile</h2>
          <p className="mt-2 text-amber-700">
            Please create a business profile to view journey insights.
          </p>
        </div>
      </div>
    );
  }

  // Parse date range (default: 30 days)
  const dateRangeValue = parseInt(searchParams.range || '30');
  const validRanges = [7, 30, 90];
  const dateRange = validRanges.includes(dateRangeValue) ? dateRangeValue : 30;

  // Parse journey type (default: 'all')
  const journeyType = (searchParams.type || 'all') as JourneyType;

  // Calculate date range
  const endDate = new Date();
  const startDate = subDays(endDate, dateRange);

  // Fetch sessions filtered by businessId and date range
  const sessions = await prisma.session.findMany({
    where: {
      siteId: business.siteId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Calculate funnel data
  const funnelData = calculateFunnelStages(sessions, dateRange, journeyType);

  // Generate insights
  const insight = generateInsight(funnelData);

  // Calculate journey type statistics
  const journeyTypeStats = calculateJourneyTypeStats(sessions);

  // Check for empty state (lowered to 1 for testing, consider 10+ for production)
  const hasInsufficientData = sessions.length < 1;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Journey Insights</h1>
        <p className="mt-2 text-muted-foreground">
          Understand your customer journey and identify friction points
        </p>
      </div>

      {/* Empty State */}
      {hasInsufficientData ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-8 text-center">
          <h2 className="text-xl font-semibold text-blue-900">Not Enough Data Yet</h2>
          <p className="mt-2 text-blue-700">
            You need at least 1 session to see journey insights. You currently have {sessions.length} session{sessions.length !== 1 ? 's' : ''}.
          </p>
          <p className="mt-4 text-sm text-blue-600">
            Install the tracking script on your website to start collecting data.
          </p>
        </div>
      ) : (
        <>
          {/* Plain-Language Insight Summary */}
          <div className="mb-8 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 p-6">
            <h2 className="text-2xl font-bold text-purple-900">{insight.primary}</h2>
            {insight.secondary && (
              <p className="mt-2 text-lg text-purple-700">{insight.secondary}</p>
            )}
          </div>

          {/* Journey Funnel Visualization */}
          <JourneyFunnel
            funnelData={funnelData}
            journeyTypeStats={journeyTypeStats}
            businessName={business.name}
          />
        </>
      )}
    </div>
  );
}

/**
 * Metadata for the page
 */
export const metadata = {
  title: 'Journey Insights | MetricFortune',
  description: 'Visualize customer journey funnels and identify drop-off points',
};
