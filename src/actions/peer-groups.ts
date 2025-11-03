"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateSimilarityScore } from "@/services/matching/business-matcher";
import type { ActionResult } from "./business-profile";
import type {
  PeerGroupData,
  DetailedPeerGroup,
  BusinessProfile,
  MatchCriteria,
} from "@/types/peer-group";

// Validation schemas
const businessIdSchema = z.string().min(1, "Business ID is required");

/**
 * Get peer group composition for a business (AC #4)
 * Returns public-facing peer group data
 *
 * @param businessId - Business ID to get peer group for
 * @returns Peer group composition data
 */
export async function getPeerGroupComposition(
  businessId: string
): Promise<ActionResult<PeerGroupData>> {
  try {
    console.log(
      `[getPeerGroupComposition] Fetching peer group for business ${businessId}`
    );

    // Validate input
    const validation = businessIdSchema.safeParse(businessId);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0].message,
      };
    }

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // Get business and verify ownership
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        userId: true,
        peerGroupId: true,
      },
    });

    if (!business) {
      return {
        success: false,
        error: "Business not found",
      };
    }

    // Verify user owns this business
    if (business.userId !== session.user.id) {
      return {
        success: false,
        error: "Unauthorized: You can only view your own peer group",
      };
    }

    // Check if peer group exists
    if (!business.peerGroupId) {
      return {
        success: false,
        error: "No peer group assigned to this business yet",
      };
    }

    // Get peer group details
    const peerGroup = await prisma.peerGroup.findUnique({
      where: { id: business.peerGroupId },
      select: {
        id: true,
        criteria: true,
        businessIds: true,
      },
    });

    if (!peerGroup) {
      return {
        success: false,
        error: "Peer group not found",
      };
    }

    // Get all businesses in peer group to aggregate data
    const peerBusinesses = await prisma.business.findMany({
      where: {
        id: { in: peerGroup.businessIds },
      },
      select: {
        industry: true,
        revenueRange: true,
        platform: true,
      },
    });

    // Aggregate peer group composition
    const industries = [
      ...new Set(peerBusinesses.map((b) => b.industry)),
    ];
    const revenueRanges = [
      ...new Set(peerBusinesses.map((b) => b.revenueRange)),
    ];
    const platforms = [
      ...new Set(peerBusinesses.map((b) => b.platform)),
    ];

    const peerGroupData: PeerGroupData = {
      peerCount: peerGroup.businessIds.length - 1, // Exclude self
      industries,
      revenueRanges,
      platforms,
      matchCriteria: peerGroup.criteria as unknown as MatchCriteria,
    };

    console.log(
      `[getPeerGroupComposition] Successfully fetched peer group: ${peerGroupData.peerCount} peers`
    );

    return {
      success: true,
      data: peerGroupData,
    };
  } catch (error) {
    console.error("[getPeerGroupComposition] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch peer group",
    };
  }
}

/**
 * Get detailed peer group information for debugging (AC #7)
 * Admin-only endpoint with full business IDs and similarity scores
 *
 * @param businessId - Business ID to debug peer group for
 * @returns Detailed peer group data including business IDs and similarity scores
 */
export async function debugPeerGroup(
  businessId: string
): Promise<ActionResult<DetailedPeerGroup>> {
  try {
    console.log(
      `[debugPeerGroup] Admin debug request for business ${businessId}`
    );

    // Validate input
    const validation = businessIdSchema.safeParse(businessId);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0].message,
      };
    }

    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // TODO: Add proper admin role check when role system is implemented
    // For now, allow any authenticated user (will be restricted to admins later)
    // Example: if (session.user.role !== "admin") { return { success: false, error: "Admin access required" }; }

    console.log(
      `[debugPeerGroup] Note: Admin authorization not yet implemented - allowing access for authenticated users`
    );

    // Get business with peer group
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        industry: true,
        revenueRange: true,
        productTypes: true,
        platform: true,
        peerGroupId: true,
      },
    });

    if (!business) {
      return {
        success: false,
        error: "Business not found",
      };
    }

    if (!business.peerGroupId) {
      return {
        success: false,
        error: "No peer group assigned to this business yet",
      };
    }

    // Get peer group with full details
    const peerGroup = await prisma.peerGroup.findUnique({
      where: { id: business.peerGroupId },
      select: {
        id: true,
        criteria: true,
        businessIds: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!peerGroup) {
      return {
        success: false,
        error: "Peer group not found",
      };
    }

    // Get all peer businesses with full details
    const peerBusinesses = await prisma.business.findMany({
      where: {
        id: { in: peerGroup.businessIds },
      },
      select: {
        id: true,
        industry: true,
        revenueRange: true,
        productTypes: true,
        platform: true,
        peerGroupId: true,
      },
    });

    // Calculate similarity scores for each peer
    const businessProfile: BusinessProfile = {
      id: business.id,
      industry: business.industry,
      revenueRange: business.revenueRange,
      productTypes: business.productTypes,
      platform: business.platform,
      peerGroupId: business.peerGroupId,
    };

    const similarityScores = peerBusinesses
      .filter((peer) => peer.id !== business.id) // Exclude self
      .map((peer) => {
        const peerProfile: BusinessProfile = {
          id: peer.id,
          industry: peer.industry,
          revenueRange: peer.revenueRange,
          productTypes: peer.productTypes,
          platform: peer.platform,
          peerGroupId: peer.peerGroupId,
        };
        return calculateSimilarityScore(businessProfile, peerProfile);
      })
      .sort((a, b) => b.score - a.score); // Sort by score descending

    // Aggregate composition data
    const industries = [
      ...new Set(peerBusinesses.map((b) => b.industry)),
    ];
    const revenueRanges = [
      ...new Set(peerBusinesses.map((b) => b.revenueRange)),
    ];
    const platforms = [
      ...new Set(peerBusinesses.map((b) => b.platform)),
    ];

    const detailedPeerGroup: DetailedPeerGroup = {
      peerCount: peerGroup.businessIds.length - 1, // Exclude self
      industries,
      revenueRanges,
      platforms,
      matchCriteria: peerGroup.criteria as unknown as MatchCriteria,
      businessIds: peerGroup.businessIds,
      similarityScores,
      createdAt: peerGroup.createdAt,
      updatedAt: peerGroup.updatedAt,
    };

    console.log(
      `[debugPeerGroup] Successfully retrieved detailed peer group: ${detailedPeerGroup.peerCount} peers, ${similarityScores.length} similarity scores`
    );

    return {
      success: true,
      data: detailedPeerGroup,
    };
  } catch (error) {
    console.error("[debugPeerGroup] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch detailed peer group",
    };
  }
}
