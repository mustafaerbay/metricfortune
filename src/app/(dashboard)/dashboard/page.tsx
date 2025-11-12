import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Star, TrendingUp } from "lucide-react";
import Link from "next/link";

async function getTopRecommendation(businessId: string) {
  // Fetch all NEW recommendations and sort by impact level manually
  // (Prisma orderBy on enums uses alphabetical order, not enum position)
  const recommendations = await prisma.recommendation.findMany({
    where: {
      businessId,
      status: "NEW",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      problemStatement: true,
      impactLevel: true,
      peerSuccessData: true,
    },
  });

  if (recommendations.length === 0) return null;

  // Sort by impact level (HIGH > MEDIUM > LOW)
  const impactOrder: Record<"HIGH" | "MEDIUM" | "LOW", number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };

  const sorted = recommendations.sort(
    (a, b) => (impactOrder[b.impactLevel] || 0) - (impactOrder[a.impactLevel] || 0)
  );

  return sorted[0];
}

async function getMetrics(businessId: string) {
  // Get business siteId first
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { siteId: true },
  });

  if (!business) {
    return {
      conversionRate: "0.0",
      activeRecommendations: 0,
      abandonmentRate: "0.0",
      peerPercentile: 50,
      hasData: false,
      conversionTrend: null,
      abandonmentTrend: null,
    };
  }

  const siteId = business.siteId;

  // Calculate date ranges for trend analysis (current 7 days vs previous 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Get current period sessions (last 7 days)
  const currentSessions = await prisma.session.findMany({
    where: {
      siteId,
      createdAt: { gte: sevenDaysAgo },
    },
    select: { converted: true },
  });

  // Get previous period sessions (7-14 days ago)
  const previousSessions = await prisma.session.findMany({
    where: {
      siteId,
      createdAt: {
        gte: fourteenDaysAgo,
        lt: sevenDaysAgo,
      },
    },
    select: { converted: true },
  });

  // Calculate current metrics
  const totalSessions = currentSessions.length;
  const conversions = currentSessions.filter((s) => s.converted).length;
  const conversionRate =
    totalSessions > 0 ? ((conversions / totalSessions) * 100).toFixed(1) : "0.0";

  // Calculate previous metrics for trend
  const prevTotalSessions = previousSessions.length;
  const prevConversions = previousSessions.filter((s) => s.converted).length;
  const prevConversionRate =
    prevTotalSessions > 0 ? (prevConversions / prevTotalSessions) * 100 : 0;

  // Calculate conversion rate trend
  const currentConvRate = parseFloat(conversionRate);
  let conversionTrend: { direction: "up" | "down"; value: string } | null = null;
  if (prevConversionRate > 0 && totalSessions >= 10) {
    const trendChange = ((currentConvRate - prevConversionRate) / prevConversionRate) * 100;
    conversionTrend = {
      direction: trendChange >= 0 ? "up" : "down",
      value: `${trendChange >= 0 ? "+" : ""}${trendChange.toFixed(1)}%`,
    };
  }

  // Get active recommendations count
  const activeRecommendations = await prisma.recommendation.count({
    where: {
      businessId,
      status: "NEW",
    },
  });

  // Get cart abandonment rate using TrackingEvent (current period)
  const currentCartEvents = await prisma.trackingEvent.findMany({
    where: {
      siteId,
      eventType: "ADD_TO_CART",
      createdAt: { gte: sevenDaysAgo },
    },
    select: { sessionId: true },
    distinct: ["sessionId"],
  });

  const currentCartSessionIds = currentCartEvents.map((e) => e.sessionId);
  const currentCartSessions = currentCartSessionIds.length;

  const currentAbandonedCarts = await prisma.session.count({
    where: {
      siteId,
      sessionId: { in: currentCartSessionIds },
      converted: false,
    },
  });

  const abandonmentRate =
    currentCartSessions > 0 ? ((currentAbandonedCarts / currentCartSessions) * 100).toFixed(1) : "0.0";

  // Get previous period cart abandonment for trend
  const prevCartEvents = await prisma.trackingEvent.findMany({
    where: {
      siteId,
      eventType: "ADD_TO_CART",
      createdAt: {
        gte: fourteenDaysAgo,
        lt: sevenDaysAgo,
      },
    },
    select: { sessionId: true },
    distinct: ["sessionId"],
  });

  const prevCartSessionIds = prevCartEvents.map((e) => e.sessionId);
  const prevCartSessions = prevCartSessionIds.length;

  const prevAbandonedCarts = await prisma.session.count({
    where: {
      siteId,
      sessionId: { in: prevCartSessionIds },
      converted: false,
    },
  });

  const prevAbandonmentRate =
    prevCartSessions > 0 ? (prevAbandonedCarts / prevCartSessions) * 100 : 0;

  // Calculate abandonment rate trend
  const currentAbandonRate = parseFloat(abandonmentRate);
  let abandonmentTrend: { direction: "up" | "down"; value: string } | null = null;
  if (prevAbandonmentRate > 0 && currentCartSessions >= 5) {
    const trendChange = ((currentAbandonRate - prevAbandonmentRate) / prevAbandonmentRate) * 100;
    abandonmentTrend = {
      direction: trendChange >= 0 ? "up" : "down",
      value: `${trendChange >= 0 ? "+" : ""}${trendChange.toFixed(1)}%`,
    };
  }

  // Peer benchmark - MVP LIMITATION (Story 2.1 code review finding #8)
  // TODO: Implement real peer comparison once Story 1.5 peer matching is complete
  // Real implementation would:
  // 1. Query peer group via business.peerGroupId
  // 2. Aggregate conversion rates across peer businesses
  // 3. Calculate percentile ranking (e.g., P50, P75, P90)
  // Current: Simple heuristic based on session volume as proxy
  const peerPercentile = totalSessions > 100 ? 75 : 50;

  return {
    conversionRate,
    activeRecommendations,
    abandonmentRate,
    peerPercentile,
    hasData: totalSessions > 0,
    conversionTrend,
    abandonmentTrend,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.businessId) {
    return <div>No business profile found</div>;
  }

  const businessId = session.user.businessId;
  const [recommendation, metrics] = await Promise.all([
    getTopRecommendation(businessId),
    getMetrics(businessId),
  ]);

  // Show empty state if no data
  if (!metrics.hasData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md border-2 border-dashed border-[#e9d5ff] bg-[#faf5ff]">
          <CardContent className="p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7c3aed]">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-bold text-[#1f2937]">
              Collecting data...
            </h2>
            <p className="mb-6 text-sm text-[#6b7280]">
              Check back in 24 hours to see your personalized recommendations
              and insights
            </p>
            <Link href="/install-tracking">
              <Button className="w-full">Install Tracking</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section - Top Priority Recommendation */}
      {recommendation ? (
        <Card className="border-2 border-[#7c3aed] bg-gradient-to-br from-white to-[#faf5ff]">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#6d28d9]">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Badge
                    variant={
                      recommendation.impactLevel === "HIGH"
                        ? "error"
                        : recommendation.impactLevel === "MEDIUM"
                        ? "secondary"
                        : "default"
                    }
                  >
                    {recommendation.impactLevel} IMPACT
                  </Badge>
                  <span className="text-xs text-[#6b7280]">Priority #1</span>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-[#1f2937]">
                  {recommendation.title}
                </h2>
                <p className="mb-4 text-sm text-[#4b5563]">
                  {recommendation.problemStatement}
                </p>
                {recommendation.peerSuccessData && (
                  <p className="mb-4 text-xs text-[#7c3aed]">
                    📊 {recommendation.peerSuccessData}
                  </p>
                )}
                <Link href={`/dashboard/recommendations/${recommendation.id}`}>
                  <Button>View Details</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-dashed border-[#e9d5ff] bg-[#faf5ff]">
          <CardContent className="p-6 text-center">
            <h2 className="mb-2 text-xl font-bold text-[#1f2937]">
              Analyzing your data...
            </h2>
            <p className="text-sm text-[#6b7280]">
              Recommendations coming soon
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Conversion Rate"
          value={`${metrics.conversionRate}%`}
          trend={metrics.conversionTrend?.direction}
          trendValue={metrics.conversionTrend?.value}
        />
        <StatsCard
          label="Active Recommendations"
          value={metrics.activeRecommendations}
          badge="NEW"
        />
        <StatsCard
          label="Peer Benchmark"
          value={`${metrics.conversionRate}%`}
          percentile={metrics.peerPercentile}
        />
        <StatsCard
          label="Cart Abandonment"
          value={`${metrics.abandonmentRate}%`}
          trend={metrics.abandonmentTrend?.direction}
          trendValue={metrics.abandonmentTrend?.value}
        />
      </div>
    </div>
  );
}
