import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RecommendationsList } from "@/components/dashboard/recommendations-list";
import { ImplementedRecommendationCard } from "@/components/dashboard/implemented-recommendation-card";
import {
  calculateBeforeMetrics,
  calculateAfterMetrics,
  calculateMetricChange,
  determineImplementationStatus,
} from "@/services/analytics/implementation-tracker";
import { differenceInDays } from "date-fns";

// Manual sorting by priority (impact × confidence)
// Prisma orderBy on enums uses alphabetical order, not enum position
// Priority = impact level × confidence level (AC #3)
function sortByPriority<
  T extends {
    impactLevel: "HIGH" | "MEDIUM" | "LOW";
    confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
    createdAt: Date;
  }
>(recommendations: T[]): T[] {
  const levelValue: Record<"HIGH" | "MEDIUM" | "LOW", number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  return recommendations.sort((a, b) => {
    // Primary sort: priority (impact × confidence, highest first)
    const priorityA =
      (levelValue[a.impactLevel] || 0) * (levelValue[a.confidenceLevel] || 0);
    const priorityB =
      (levelValue[b.impactLevel] || 0) * (levelValue[b.confidenceLevel] || 0);
    const priorityDiff = priorityB - priorityA;
    if (priorityDiff !== 0) return priorityDiff;

    // Secondary sort: createdAt (newest first)
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; impact?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return <div>No business profile found</div>;
  }

  const params = await searchParams;
  const businessId = session.user.businessId;

  // Build Prisma where clause with optional filters
  const whereClause: {
    businessId: string;
    status?: "NEW" | "PLANNED" | "IMPLEMENTED" | "DISMISSED";
    impactLevel?: "HIGH" | "MEDIUM" | "LOW";
  } = {
    businessId,
  };

  // Apply status filter if provided and valid
  if (
    params.status &&
    ["NEW", "PLANNED", "IMPLEMENTED", "DISMISSED"].includes(
      params.status.toUpperCase()
    )
  ) {
    whereClause.status = params.status.toUpperCase() as
      | "NEW"
      | "PLANNED"
      | "IMPLEMENTED"
      | "DISMISSED";
  }

  // Apply impact filter if provided and valid
  if (
    params.impact &&
    ["HIGH", "MEDIUM", "LOW"].includes(params.impact.toUpperCase())
  ) {
    whereClause.impactLevel = params.impact.toUpperCase() as
      | "HIGH"
      | "MEDIUM"
      | "LOW";
  }

  // Check if showing IMPLEMENTED status
  const isImplementedView = whereClause.status === "IMPLEMENTED";

  // If showing implemented recommendations, fetch with metrics data
  if (isImplementedView) {
    const implementedRecommendations = await prisma.recommendation.findMany({
      where: whereClause,
      orderBy: { implementedAt: "desc" },
      select: {
        id: true,
        businessId: true,
        title: true,
        problemStatement: true,
        actionSteps: true,
        expectedImpact: true,
        impactLevel: true,
        confidenceLevel: true,
        status: true,
        peerSuccessData: true,
        createdAt: true,
        implementedAt: true,
        implementationNotes: true,
        dismissedAt: true,
        business: {
          select: {
            siteId: true,
          },
        },
      },
    });

    // Calculate metrics for each implemented recommendation
    const implementedWithMetrics = await Promise.all(
      implementedRecommendations.map(async (rec) => {
        if (!rec.implementedAt) return null;

        const siteId = rec.business.siteId;
        const daysSince = differenceInDays(new Date(), rec.implementedAt);

        // Calculate before/after metrics
        const beforeMetrics = await calculateBeforeMetrics(siteId, rec.implementedAt);
        const afterMetrics = await calculateAfterMetrics(siteId, rec.implementedAt);

        // Calculate metric changes
        const conversionChange = calculateMetricChange(
          beforeMetrics.conversionRate,
          afterMetrics.conversionRate,
          false // higher is better
        );

        const abandonmentChange = calculateMetricChange(
          beforeMetrics.cartAbandonmentRate,
          afterMetrics.cartAbandonmentRate,
          true // lower is better
        );

        // Determine status
        const status = determineImplementationStatus(
          daysSince,
          conversionChange,
          abandonmentChange
        );

        return {
          recommendation: rec,
          beforeMetrics,
          afterMetrics,
          conversionChange,
          abandonmentChange,
          status,
        };
      })
    );

    // Filter out any null results
    const validImplemented = implementedWithMetrics.filter((item) => item !== null);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Implemented Recommendations
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Track before/after metrics for recommendations you've implemented
            </p>
          </div>
        </div>

        {validImplemented.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-600">
              No implemented recommendations yet. Mark a recommendation as implemented to start
              tracking results!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {validImplemented.map((item) => (
              <ImplementedRecommendationCard
                key={item!.recommendation.id}
                recommendation={item!.recommendation}
                beforeMetrics={item!.beforeMetrics}
                afterMetrics={item!.afterMetrics}
                conversionChange={item!.conversionChange}
                abandonmentChange={item!.abandonmentChange}
                status={item!.status}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default view: fetch recommendations without metrics
  const recommendations = await prisma.recommendation.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      problemStatement: true,
      impactLevel: true,
      confidenceLevel: true,
      status: true,
      peerSuccessData: true,
      createdAt: true,
    },
  });

  // Manual sorting by priority (impact × confidence), then by createdAt
  const sortedRecommendations = sortByPriority(recommendations);

  return (
    <RecommendationsList
      recommendations={sortedRecommendations}
      currentFilters={{
        status: params.status,
        impact: params.impact,
      }}
    />
  );
}
