"use server";

/**
 * Pattern Data Server Actions
 *
 * Server Actions for accessing detected behavioral patterns and friction points
 * from the pattern detection engine.
 *
 * All actions require authentication and verify business ownership.
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "./business-profile";
import type { PatternQueryOptions, DateRange } from "@/types/pattern";
import type { Pattern } from "@prisma/client";

/**
 * Validation schemas
 */
const businessIdSchema = z.string().min(1, "Business ID is required");

const patternIdSchema = z.string().min(1, "Pattern ID is required");

const patternQueryOptionsSchema = z
  .object({
    patternType: z.enum(["ABANDONMENT", "HESITATION", "LOW_ENGAGEMENT"]).optional(),
    minSeverity: z.number().min(0).max(1).optional(),
    minConfidence: z.number().min(0).max(1).optional(),
    dateRange: z
      .object({
        startDate: z.date(),
        endDate: z.date(),
      })
      .refine((data) => data.startDate <= data.endDate, {
        message: "Start date must be before or equal to end date",
      })
      .optional(),
    limit: z.number().min(1).max(1000).optional(),
    sortBy: z.enum(["severity", "detectedAt", "confidence"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  })
  .optional();

/**
 * Get patterns for a business (AC #6)
 *
 * Retrieves detected behavioral patterns for a business's site.
 * Supports filtering by pattern type, severity, confidence, and date range.
 *
 * @param businessId - Business ID to get patterns for
 * @param options - Optional query filters and sorting
 * @returns Array of pattern records
 *
 * @example
 * const result = await getPatterns('biz_123', {
 *   patternType: 'ABANDONMENT',
 *   minSeverity: 0.7,
 *   limit: 10
 * });
 */
export async function getPatterns(
  businessId: string,
  options?: PatternQueryOptions
): Promise<ActionResult<Pattern[]>> {
  try {
    console.log(
      `[getPatterns] Fetching patterns for business ${businessId}`,
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
      const optionsValidation = patternQueryOptionsSchema.safeParse(options);
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
        siteId: true,
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
        error: "Unauthorized: You can only view your own pattern data",
      };
    }

    // Check if site is configured
    if (!business.siteId) {
      return {
        success: false,
        error: "No site configured for this business",
      };
    }

    // Build query filters
    const where: {
      siteId: string;
      patternType?: string;
      severity?: {
        gte?: number;
      };
      confidenceScore?: {
        gte?: number;
      };
      detectedAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      siteId: business.siteId,
    };

    if (options?.patternType) {
      where.patternType = options.patternType;
    }

    if (options?.minSeverity !== undefined) {
      where.severity = {
        gte: options.minSeverity,
      };
    }

    if (options?.minConfidence !== undefined) {
      where.confidenceScore = {
        gte: options.minConfidence,
      };
    }

    if (options?.dateRange) {
      where.detectedAt = {
        gte: options.dateRange.startDate,
        lte: options.dateRange.endDate,
      };
    }

    // Build order by
    const orderBy: Record<string, "asc" | "desc"> = {};
    const sortBy = options?.sortBy || "severity";
    const sortOrder = options?.sortOrder || "desc";
    orderBy[sortBy] = sortOrder;

    // Fetch patterns
    const patterns = await prisma.pattern.findMany({
      where,
      orderBy,
      take: options?.limit || 100,
    });

    console.log(`[getPatterns] Retrieved ${patterns.length} patterns`);

    return {
      success: true,
      data: patterns,
    };
  } catch (error) {
    console.error("[getPatterns] Error fetching patterns:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch pattern data",
    };
  }
}

/**
 * Get a single pattern by ID (AC #6)
 *
 * Retrieves a specific pattern with full details.
 * Requires authentication and verifies business ownership via siteId.
 *
 * @param patternId - Pattern ID to retrieve
 * @returns Pattern record with full details
 *
 * @example
 * const result = await getPatternById('pattern_abc123');
 */
export async function getPatternById(
  patternId: string
): Promise<ActionResult<Pattern>> {
  try {
    console.log(`[getPatternById] Fetching pattern ${patternId}`);

    // Validate input
    const validation = patternIdSchema.safeParse(patternId);
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

    // Fetch pattern
    const pattern = await prisma.pattern.findUnique({
      where: { id: patternId },
    });

    if (!pattern) {
      return {
        success: false,
        error: "Pattern not found",
      };
    }

    // Verify user owns the business associated with this pattern's siteId
    const business = await prisma.business.findUnique({
      where: { siteId: pattern.siteId },
      select: {
        userId: true,
      },
    });

    if (!business) {
      return {
        success: false,
        error: "Business not found for this pattern",
      };
    }

    if (business.userId !== session.user.id) {
      return {
        success: false,
        error: "Unauthorized: You can only view patterns for your own business",
      };
    }

    console.log(`[getPatternById] Retrieved pattern ${patternId}`);

    return {
      success: true,
      data: pattern,
    };
  } catch (error) {
    console.error("[getPatternById] Error fetching pattern:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch pattern",
    };
  }
}

/**
 * Get pattern summary statistics for a business
 *
 * Returns high-level metrics about detected patterns:
 * - Total patterns detected
 * - Breakdown by pattern type
 * - Average severity
 * - Highest severity patterns (top 5)
 *
 * @param businessId - Business ID to get stats for
 * @param dateRange - Optional date range filter
 * @returns Pattern summary statistics
 */
export async function getPatternStats(
  businessId: string,
  dateRange?: DateRange
): Promise<
  ActionResult<{
    totalPatterns: number;
    abandonmentCount: number;
    hesitationCount: number;
    lowEngagementCount: number;
    averageSeverity: number;
    highestSeverityPatterns: Pattern[];
  }>
> {
  try {
    console.log(
      `[getPatternStats] Fetching pattern stats for business ${businessId}`
    );

    // Validate input
    const businessValidation = businessIdSchema.safeParse(businessId);
    if (!businessValidation.success) {
      return {
        success: false,
        error: businessValidation.error.issues[0].message,
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
        siteId: true,
      },
    });

    if (!business) {
      return {
        success: false,
        error: "Business not found",
      };
    }

    if (business.userId !== session.user.id) {
      return {
        success: false,
        error: "Unauthorized: You can only view your own pattern statistics",
      };
    }

    if (!business.siteId) {
      return {
        success: false,
        error: "No site configured for this business",
      };
    }

    // Build query filters
    const where: {
      siteId: string;
      detectedAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      siteId: business.siteId,
    };

    if (dateRange) {
      where.detectedAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }

    // Calculate aggregate statistics
    const [
      totalPatterns,
      abandonmentCount,
      hesitationCount,
      lowEngagementCount,
      avgSeverity,
      topPatterns,
    ] = await Promise.all([
      // Total patterns
      prisma.pattern.count({ where }),
      // Abandonment patterns
      prisma.pattern.count({
        where: { ...where, patternType: "ABANDONMENT" },
      }),
      // Hesitation patterns
      prisma.pattern.count({
        where: { ...where, patternType: "HESITATION" },
      }),
      // Low engagement patterns
      prisma.pattern.count({
        where: { ...where, patternType: "LOW_ENGAGEMENT" },
      }),
      // Average severity
      prisma.pattern.aggregate({
        where,
        _avg: {
          severity: true,
        },
      }),
      // Top 5 highest severity patterns
      prisma.pattern.findMany({
        where,
        orderBy: {
          severity: "desc",
        },
        take: 5,
      }),
    ]);

    const stats = {
      totalPatterns,
      abandonmentCount,
      hesitationCount,
      lowEngagementCount,
      averageSeverity: avgSeverity._avg.severity
        ? Math.round(avgSeverity._avg.severity * 1000) / 1000
        : 0,
      highestSeverityPatterns: topPatterns,
    };

    console.log(`[getPatternStats] Stats calculated:`, stats);

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("[getPatternStats] Error calculating pattern stats:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to calculate pattern statistics",
    };
  }
}
