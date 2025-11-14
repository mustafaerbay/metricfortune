import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RecommendationsList } from "@/components/dashboard/recommendations-list";

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

  // Fetch recommendations with filters
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
