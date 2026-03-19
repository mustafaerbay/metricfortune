'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchDailyMetrics } from '@/services/analytics/implementation-tracker';
import type { DailyMetric } from '@/types/implementation';

/**
 * Server Action wrapper for fetchDailyMetrics.
 * Enforces authentication and business ownership before returning chart data.
 * Throws on auth failure so MetricTrendChart's catch block displays the error UI.
 */
export async function getDailyMetrics(
  siteId: string,
  implementedAt: Date
): Promise<DailyMetric[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  // Verify the caller owns the business associated with this siteId
  const business = await prisma.business.findUnique({
    where: { siteId },
    select: { userId: true },
  });

  if (!business) {
    throw new Error('Business not found');
  }

  if (business.userId !== session.user.id) {
    throw new Error('Unauthorized: You do not have access to this data');
  }

  return fetchDailyMetrics(siteId, implementedAt);
}
