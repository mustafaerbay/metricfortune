"use server";

/**
 * Session Data Server Actions
 *
 * Server Actions for accessing aggregated session data and
 * journey funnels from the analytics engine.
 *
 * All actions require authentication and verify business ownership.
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateJourneyFunnels } from "@/services/analytics/session-aggregator";
import type { ActionResult } from "./business-profile";
import type { DateRange, JourneyFunnelData } from "@/types/session";
import type { Session } from "@prisma/client";

/**
 * Validation schemas
 */
const businessIdSchema = z.string().min(1, "Business ID is required");

const dateRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "Start date must be before or equal to end date",
  })
  .optional();

/**
 * Get sessions for a business (AC #5)
 *
 * Retrieves aggregated session data for a business's site.
 * Optionally filters by date range.
 *
 * @param businessId - Business ID to get sessions for
 * @param dateRange - Optional date range filter
 * @returns Array of session records
 *
 * @example
 * const result = await getSessions('biz_123', {
 *   startDate: new Date('2025-11-01'),
 *   endDate: new Date('2025-11-03')
 * });
 */
export async function getSessions(
  businessId: string,
  dateRange?: DateRange
): Promise<ActionResult<Session[]>> {
  try {
    console.log(
      `[getSessions] Fetching sessions for business ${businessId}`,
      dateRange ? `with date range: ${dateRange.startDate} to ${dateRange.endDate}` : "no date filter"
    );

    // Validate input
    const businessValidation = businessIdSchema.safeParse(businessId);
    if (!businessValidation.success) {
      return {
        success: false,
        error: businessValidation.error.issues[0].message,
      };
    }

    if (dateRange) {
      const dateRangeValidation = dateRangeSchema.safeParse(dateRange);
      if (!dateRangeValidation.success) {
        return {
          success: false,
          error: dateRangeValidation.error.issues[0].message,
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
        error: "Unauthorized: You can only view your own session data",
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
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      siteId: business.siteId,
    };

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }

    // Fetch sessions
    const sessions = await prisma.session.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      // Limit to last 10000 sessions for performance
      take: 10000,
    });

    console.log(`[getSessions] Retrieved ${sessions.length} sessions`);

    return {
      success: true,
      data: sessions,
    };
  } catch (error) {
    console.error("[getSessions] Error fetching sessions:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch session data",
    };
  }
}

/**
 * Get journey funnels for a business (AC #6)
 *
 * Calculates and returns journey funnel data with stages and
 * drop-off rates for visualization.
 *
 * @param businessId - Business ID to get journey funnels for
 * @returns Journey funnel data with stages and metrics
 *
 * @example
 * const result = await getJourneyFunnels('biz_123');
 * console.log(result.data.funnels); // [{ stage: 'Entry', visitors: 1000, dropOffRate: 15 }, ...]
 */
export async function getJourneyFunnels(
  businessId: string
): Promise<ActionResult<JourneyFunnelData>> {
  try {
    console.log(
      `[getJourneyFunnels] Calculating journey funnels for business ${businessId}`
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
        error: "Unauthorized: You can only view your own journey data",
      };
    }

    // Check if site is configured
    if (!business.siteId) {
      return {
        success: false,
        error: "No site configured for this business",
      };
    }

    // Calculate journey funnels using the service
    const funnelData = await calculateJourneyFunnels(business.siteId);

    console.log(
      `[getJourneyFunnels] Calculated ${funnelData.funnels.length} funnel stages`
    );

    return {
      success: true,
      data: funnelData,
    };
  } catch (error) {
    console.error("[getJourneyFunnels] Error calculating funnels:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to calculate journey funnels",
    };
  }
}

/**
 * Get session summary statistics for a business
 *
 * Returns high-level metrics about sessions:
 * - Total sessions
 * - Total conversions
 * - Conversion rate
 * - Average session duration
 * - Bounce rate
 *
 * @param businessId - Business ID to get stats for
 * @param dateRange - Optional date range filter
 * @returns Session summary statistics
 */
export async function getSessionStats(
  businessId: string,
  dateRange?: DateRange
): Promise<
  ActionResult<{
    totalSessions: number;
    totalConversions: number;
    conversionRate: number;
    averageDuration: number | null;
    bounceRate: number;
  }>
> {
  try {
    console.log(`[getSessionStats] Fetching stats for business ${businessId}`);

    // Validate input
    const businessValidation = businessIdSchema.safeParse(businessId);
    if (!businessValidation.success) {
      return {
        success: false,
        error: businessValidation.error.issues[0].message,
      };
    }

    if (dateRange) {
      const dateRangeValidation = dateRangeSchema.safeParse(dateRange);
      if (!dateRangeValidation.success) {
        return {
          success: false,
          error: dateRangeValidation.error.issues[0].message,
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

    if (business.userId !== session.user.id) {
      return {
        success: false,
        error: "Unauthorized: You can only view your own statistics",
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
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      siteId: business.siteId,
    };

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }

    // Calculate aggregate statistics
    const [totalSessions, conversions, bounces, avgDuration] =
      await Promise.all([
        // Total sessions
        prisma.session.count({ where }),
        // Total conversions
        prisma.session.count({
          where: { ...where, converted: true },
        }),
        // Total bounces
        prisma.session.count({
          where: { ...where, bounced: true },
        }),
        // Average duration
        prisma.session.aggregate({
          where,
          _avg: {
            duration: true,
          },
        }),
      ]);

    const conversionRate =
      totalSessions > 0 ? (conversions / totalSessions) * 100 : 0;
    const bounceRate = totalSessions > 0 ? (bounces / totalSessions) * 100 : 0;

    const stats = {
      totalSessions,
      totalConversions: conversions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageDuration: avgDuration._avg.duration
        ? Math.round(avgDuration._avg.duration)
        : null,
      bounceRate: Math.round(bounceRate * 100) / 100,
    };

    console.log(`[getSessionStats] Stats calculated:`, stats);

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("[getSessionStats] Error calculating stats:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to calculate statistics",
    };
  }
}
