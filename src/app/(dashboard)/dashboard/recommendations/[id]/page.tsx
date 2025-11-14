import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImpactBadge } from "@/components/dashboard/impact-badge";
import { ConfidenceMeter } from "@/components/dashboard/confidence-meter";
import { ArrowLeft, Construction } from "lucide-react";

export default async function RecommendationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return <div>No business profile found</div>;
  }

  const { id } = await params;

  // Fetch recommendation and verify ownership
  const recommendation = await prisma.recommendation.findUnique({
    where: { id },
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
    },
  });

  // Check if recommendation exists and belongs to user's business
  if (!recommendation || recommendation.businessId !== session.user.businessId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/dashboard/recommendations">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Recommendations
        </Button>
      </Link>

      {/* Placeholder Notice */}
      <Card className="border-2 border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Construction className="h-6 w-6 shrink-0 text-amber-600" />
            <div>
              <h3 className="mb-1 font-semibold text-amber-900">
                Full Detail View Coming Soon
              </h3>
              <p className="text-sm text-amber-700">
                This is a placeholder page for Story 2.2. The complete
                recommendation detail view with action steps, implementation
                tracking, and peer data will be implemented in{" "}
                <strong>Story 2.3</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Recommendation Info */}
      <Card className="border-2 border-[#e9d5ff]">
        <CardContent className="p-6">
          {/* Header with Badges */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-[#1f2937]">
                {recommendation.title}
              </h1>
              <p className="text-sm text-[#6b7280]">
                Created {recommendation.createdAt.toLocaleDateString()}
              </p>
            </div>
            <ImpactBadge level={recommendation.impactLevel} />
          </div>

          {/* Problem Statement */}
          <div className="mb-6">
            <h2 className="mb-2 text-lg font-semibold text-[#1f2937]">
              Problem Statement
            </h2>
            <p className="text-[#4b5563]">{recommendation.problemStatement}</p>
          </div>

          {/* Confidence */}
          <div className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-[#1f2937]">
              Confidence Level
            </h2>
            <ConfidenceMeter level={recommendation.confidenceLevel} />
          </div>

          {/* Expected Impact */}
          <div className="mb-6">
            <h2 className="mb-2 text-lg font-semibold text-[#1f2937]">
              Expected Impact
            </h2>
            <p className="text-[#4b5563]">{recommendation.expectedImpact}</p>
          </div>

          {/* Action Steps Preview */}
          <div className="mb-6">
            <h2 className="mb-2 text-lg font-semibold text-[#1f2937]">
              Action Steps
            </h2>
            <ul className="list-inside list-disc space-y-1 text-[#4b5563]">
              {recommendation.actionSteps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
          </div>

          {/* Peer Success Data */}
          {recommendation.peerSuccessData && (
            <div className="border-t border-gray-200 pt-6">
              <h2 className="mb-2 text-lg font-semibold text-[#1f2937]">
                Peer Success Data
              </h2>
              <p className="text-[#4b5563]">{recommendation.peerSuccessData}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
