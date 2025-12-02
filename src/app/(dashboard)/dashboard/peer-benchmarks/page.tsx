/**
 * Peer Benchmarks Page
 * Story 2.5: Peer Benchmarks Tab
 *
 * Server Component that fetches user's business, peer group, and session data,
 * calculates metrics, and displays comparative analysis.
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { PeerComparisonTable } from '@/components/dashboard/peer-comparison-table';
import {
  calculateUserMetrics,
  calculatePeerMetrics,
  compareMetrics,
  generatePeerGroupDescription
} from '@/services/analytics/peer-calculator';
import type { PeerGroupInfo } from '@/types/peer';

export default async function PeerBenchmarksPage() {
  // Authenticate user
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch user's business profile
  const business = await prisma.business.findUnique({
    where: { userId: session.user.id },
    include: { peerGroup: true }
  });

  if (!business) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Peer Benchmarks</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800">
            No business profile found. Please complete your business registration.
          </p>
        </div>
      </div>
    );
  }

  // Handle case: No peer group assigned yet
  if (!business.peerGroupId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Peer Benchmarks</h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">
            We're finding similar businesses for you. Check back soon to see how you compare!
          </p>
        </div>
      </div>
    );
  }

  // Fetch peer group businesses (exclude current business)
  const peerBusinesses = await prisma.business.findMany({
    where: {
      peerGroupId: business.peerGroupId,
      id: { not: business.id }
    }
  });

  // Handle case: Insufficient peer data for statistical validity
  if (peerBusinesses.length < 10) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Peer Benchmarks</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 mb-2">
            Limited peer data available. Benchmarks will improve as more businesses join.
          </p>
          <p className="text-sm text-amber-700">
            Currently matched with {peerBusinesses.length} similar businesses.
            We recommend at least 10 for accurate comparisons.
          </p>
        </div>
      </div>
    );
  }

  // Fetch user's recent sessions for metrics calculation
  const userSessions = await prisma.session.findMany({
    where: { siteId: business.siteId },
    orderBy: { createdAt: 'desc' },
    take: 1000 // Last 1000 sessions for recent performance
  });

  // Handle case: New business with insufficient session data
  if (userSessions.length < 100) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Peer Benchmarks</h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 mb-2">
            Collecting more data for accurate benchmarks.
          </p>
          <p className="text-sm text-blue-700">
            You have {userSessions.length} sessions recorded. We need at least 100 sessions
            to provide reliable peer comparisons.
          </p>
        </div>
      </div>
    );
  }

  // Calculate user metrics
  const userMetrics = calculateUserMetrics(userSessions);

  // Calculate peer group aggregate metrics
  const peerMetrics = await calculatePeerMetrics(peerBusinesses);

  // Generate detailed comparisons
  const comparisons = await compareMetrics(userMetrics, peerMetrics, peerBusinesses);

  // Generate peer group info
  const peerGroupInfo: PeerGroupInfo = {
    count: peerBusinesses.length,
    industry: business.industry,
    revenueRange: business.revenueRange,
    description: generatePeerGroupDescription(
      peerBusinesses.length,
      business.industry,
      business.revenueRange
    )
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Peer Benchmarks</h1>
        <p className="text-gray-600">
          See how your performance compares to similar e-commerce businesses
        </p>
      </div>

      {/* Peer comparison table */}
      <PeerComparisonTable data={comparisons} peerGroupInfo={peerGroupInfo} />
    </div>
  );
}
