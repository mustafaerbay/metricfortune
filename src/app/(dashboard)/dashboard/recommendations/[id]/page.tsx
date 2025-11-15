import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RecommendationDetail } from "@/components/dashboard/recommendation-detail";
import { ArrowLeft } from "lucide-react";

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
      implementedAt: true,
      implementationNotes: true,
      dismissedAt: true,
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

      {/* Recommendation Detail Component */}
      <RecommendationDetail recommendation={recommendation} />
    </div>
  );
}
