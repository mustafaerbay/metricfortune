"use server";

/**
 * Recommendation Data Server Actions
 *
 * Server Actions for accessing, updating, and managing generated recommendations.
 * All actions require authentication and verify business ownership.
 *
 * @module actions/recommendations
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "./business-profile";
import type { RecommendationQueryOptions } from "@/types/recommendation";
import type { Recommendation } from "@prisma/client";

/**
 * Validation schemas
 */
const businessIdSchema = z.string().min(1, "Business ID is required");

const recommendationIdSchema = z.string().min(1, "Recommendation ID is required");

const recommendationQueryOptionsSchema = z
  .object({
    status: z.enum(["NEW", "PLANNED", "IMPLEMENTED", "DISMISSED"]).optional(),
    impactLevel: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
    confidenceLevel: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
    limit: z.number().min(1).max(100).optional(),
    sortBy: z.enum(["createdAt", "impactLevel"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  })
  .optional();

/**
 * Get recommendations for a business (AC #7)
 *
 * Retrieves generated recommendations for a business with optional filtering.
 * Supports filtering by status, impact level, confidence level, and sorting.
 *
 * @param businessId - Business ID to get recommendations for
 * @param options - Optional query filters and sorting
 * @returns Array of recommendation records
 *
 * @example
 * const result = await getRecommendations('biz_123', {
 *   status: 'NEW',
 *   impactLevel: 'HIGH',
 *   limit: 10
 * });
 */
export async function getRecommendations(
  businessId: string,
  options?: RecommendationQueryOptions
): Promise<ActionResult<Recommendation[]>> {
  try {
    console.log(
      `[getRecommendations] Fetching recommendations for business ${businessId}`,
      options ? `with filters: ${JSON.stringify(options)}` : "no filters"
    );

    // Validate input
    const businessValidation = businessIdSchema.safeParse(businessId);
    if (!businessValidation.success) {
      return {
        success: false,
        error: businessValidation.error.issues[0].message,
      };
    }

    if (options) {
      const optionsValidation =
        recommendationQueryOptionsSchema.safeParse(options);
      if (!optionsValidation.success) {
        return {
          success: false,
          error: optionsValidation.error.issues[0].message,
        };
      }
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
        error: "Unauthorized: You can only view your own recommendations",
      };
    }

    // Build query filters
    const where: any = {
      businessId,
    };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.impactLevel) {
      where.impactLevel = options.impactLevel;
    }

    if (options?.confidenceLevel) {
      where.confidenceLevel = options.confidenceLevel;
    }

    // Build orderBy
    const orderBy: any = {};
    if (options?.sortBy) {
      orderBy[options.sortBy] = options.sortOrder || "desc";
    } else {
      // Default: sort by createdAt DESC (newest first)
      orderBy.createdAt = "desc";
    }

    // Query recommendations
    const recommendations = await prisma.recommendation.findMany({
      where,
      orderBy,
      take: options?.limit,
    });

    console.log(
      `[getRecommendations] Found ${recommendations.length} recommendations for business ${businessId}`
    );

    return {
      success: true,
      data: recommendations,
    };
  } catch (error) {
    console.error("[getRecommendations] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch recommendations",
    };
  }
}

/**
 * Get a single recommendation by ID (AC #7)
 *
 * Retrieves detailed information for a specific recommendation.
 * Verifies business ownership before returning data.
 *
 * @param recommendationId - Recommendation ID to retrieve
 * @returns Single recommendation record
 *
 * @example
 * const result = await getRecommendationById('rec_abc123');
 */
export async function getRecommendationById(
  recommendationId: string
): Promise<ActionResult<Recommendation>> {
  try {
    console.log(
      `[getRecommendationById] Fetching recommendation ${recommendationId}`
    );

    // Validate input
    const validation = recommendationIdSchema.safeParse(recommendationId);
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

    // Get recommendation with business ownership check
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
      include: {
        business: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!recommendation) {
      return {
        success: false,
        error: "Recommendation not found",
      };
    }

    // Verify user owns the business
    if (recommendation.business.userId !== session.user.id) {
      return {
        success: false,
        error: "Unauthorized: You can only view your own recommendations",
      };
    }

    // Remove business from response (not needed in recommendation data)
    const { business, ...recommendationData } = recommendation;

    console.log(
      `[getRecommendationById] Found recommendation ${recommendationId}`
    );

    return {
      success: true,
      data: recommendationData as Recommendation,
    };
  } catch (error) {
    console.error("[getRecommendationById] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch recommendation",
    };
  }
}

/**
 * Mark a recommendation as implemented (AC #7)
 *
 * Updates recommendation status to IMPLEMENTED and sets implementation timestamp.
 * Used when a business owner implements a recommendation and wants to track it.
 *
 * @param recommendationId - Recommendation ID to mark implemented
 * @param implementedAt - Optional timestamp (defaults to now)
 * @returns Updated recommendation record
 *
 * @example
 * const result = await markRecommendationImplemented('rec_abc123');
 */
export async function markRecommendationImplemented(
  recommendationId: string,
  implementedAt?: Date
): Promise<ActionResult<Recommendation>> {
  try {
    console.log(
      `[markRecommendationImplemented] Marking recommendation ${recommendationId} as implemented`
    );

    // Validate input
    const validation = recommendationIdSchema.safeParse(recommendationId);
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

    // Get recommendation with business ownership check
    const existingRecommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
      include: {
        business: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingRecommendation) {
      return {
        success: false,
        error: "Recommendation not found",
      };
    }

    // Verify user owns the business
    if (existingRecommendation.business.userId !== session.user.id) {
      return {
        success: false,
        error: "Unauthorized: You can only update your own recommendations",
      };
    }

    // Update recommendation
    const updatedRecommendation = await prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        status: "IMPLEMENTED",
        implementedAt: implementedAt || new Date(),
      },
    });

    console.log(
      `[markRecommendationImplemented] Recommendation ${recommendationId} marked as IMPLEMENTED`
    );

    return {
      success: true,
      data: updatedRecommendation,
    };
  } catch (error) {
    console.error("[markRecommendationImplemented] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to mark recommendation as implemented",
    };
  }
}

/**
 * Dismiss a recommendation (AC #7)
 *
 * Updates recommendation status to DISMISSED and sets dismissal timestamp.
 * Used when a business owner decides not to implement a recommendation.
 *
 * @param recommendationId - Recommendation ID to dismiss
 * @returns Updated recommendation record
 *
 * @example
 * const result = await dismissRecommendation('rec_abc123');
 */
export async function dismissRecommendation(
  recommendationId: string
): Promise<ActionResult<Recommendation>> {
  try {
    console.log(
      `[dismissRecommendation] Dismissing recommendation ${recommendationId}`
    );

    // Validate input
    const validation = recommendationIdSchema.safeParse(recommendationId);
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

    // Get recommendation with business ownership check
    const existingRecommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
      include: {
        business: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingRecommendation) {
      return {
        success: false,
        error: "Recommendation not found",
      };
    }

    // Verify user owns the business
    if (existingRecommendation.business.userId !== session.user.id) {
      return {
        success: false,
        error: "Unauthorized: You can only update your own recommendations",
      };
    }

    // Update recommendation
    const updatedRecommendation = await prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        status: "DISMISSED",
        dismissedAt: new Date(),
      },
    });

    console.log(
      `[dismissRecommendation] Recommendation ${recommendationId} marked as DISMISSED`
    );

    return {
      success: true,
      data: updatedRecommendation,
    };
  } catch (error) {
    console.error("[dismissRecommendation] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to dismiss recommendation",
    };
  }
}

/**
 * Plan a recommendation for future implementation
 *
 * Updates recommendation status to PLANNED.
 * Used when a business owner decides to implement a recommendation later.
 *
 * @param recommendationId - Recommendation ID to plan
 * @returns Updated recommendation record
 *
 * @example
 * const result = await planRecommendation('rec_abc123');
 */
export async function planRecommendation(
  recommendationId: string
): Promise<ActionResult<Recommendation>> {
  try {
    console.log(
      `[planRecommendation] Planning recommendation ${recommendationId}`
    );

    // Validate input
    const validation = recommendationIdSchema.safeParse(recommendationId);
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

    // Get recommendation with business ownership check
    const existingRecommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
      include: {
        business: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingRecommendation) {
      return {
        success: false,
        error: "Recommendation not found",
      };
    }

    // Verify user owns the business
    if (existingRecommendation.business.userId !== session.user.id) {
      return {
        success: false,
        error: "Unauthorized: You can only update your own recommendations",
      };
    }

    // Update recommendation
    const updatedRecommendation = await prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        status: "PLANNED",
      },
    });

    console.log(
      `[planRecommendation] Recommendation ${recommendationId} marked as PLANNED`
    );

    return {
      success: true,
      data: updatedRecommendation,
    };
  } catch (error) {
    console.error("[planRecommendation] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to plan recommendation",
    };
  }
}
