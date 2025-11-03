/**
 * Business Matching Service
 *
 * Core business logic for peer group matching algorithm.
 * Pure TypeScript module with no Next.js dependencies.
 *
 * Matching Strategy (AC #1, #3):
 * - Industry: Exact match (highest priority)
 * - Revenue Range: ±1 tier acceptable
 * - Product Types: Jaccard similarity ≥ 0.3 threshold
 * - Platform: Exact match preferred, relaxed if needed
 *
 * Tiered Matching (AC #3 - minimum 10 businesses):
 * 1. Strict: industry exact + revenue exact + productTypes ≥ 0.5 + platform exact
 * 2. Relaxed: industry exact + revenue ±1 tier + productTypes ≥ 0.3
 * 3. Broad: industry exact + revenue ±2 tiers
 * 4. Fallback: industry exact only (accept smaller group if needed)
 */

import { prisma } from "@/lib/prisma";
import type {
  BusinessProfile,
  MatchCriteria,
  SimilarityScore,
  PeerGroupCalculationResult,
} from "@/types/peer-group";

// Revenue range tiers for matching logic
const REVENUE_TIERS = [
  "$0-100k",
  "$100k-500k",
  "$500k-1M",
  "$1M-5M",
  "$5M-10M",
  "$10M-50M",
  "$50M+",
] as const;

const MIN_PEER_GROUP_SIZE = 10;
const MINIMUM_ACCEPTABLE_PEER_GROUP_SIZE = 5; // Fallback minimum

/**
 * Calculate Jaccard similarity coefficient between two string arrays
 * Jaccard = |intersection| / |union|
 *
 * @example
 * calculateJaccardSimilarity(['a', 'b', 'c'], ['b', 'c', 'd']) => 0.5
 * (intersection: [b, c] = 2, union: [a, b, c, d] = 4, result: 2/4 = 0.5)
 */
export function calculateJaccardSimilarity(
  setA: string[],
  setB: string[]
): number {
  if (setA.length === 0 && setB.length === 0) return 1.0;
  if (setA.length === 0 || setB.length === 0) return 0.0;

  const uniqueA = new Set(setA.map((s) => s.toLowerCase()));
  const uniqueB = new Set(setB.map((s) => s.toLowerCase()));

  // Calculate intersection
  const intersection = new Set([...uniqueA].filter((x) => uniqueB.has(x)));

  // Calculate union
  const union = new Set([...uniqueA, ...uniqueB]);

  return intersection.size / union.size;
}

/**
 * Get tier index for a revenue range
 */
function getRevenueTierIndex(revenueRange: string): number {
  const index = REVENUE_TIERS.indexOf(
    revenueRange as (typeof REVENUE_TIERS)[number]
  );
  return index === -1 ? -1 : index;
}

/**
 * Check if two revenue ranges are within N tiers of each other
 *
 * @example
 * isRevenueRangeWithinTiers('$1M-5M', '$500k-1M', 1) => true (adjacent tiers)
 * isRevenueRangeWithinTiers('$1M-5M', '$10M-50M', 1) => false (2 tiers apart)
 */
export function isRevenueRangeWithinTiers(
  range1: string,
  range2: string,
  maxTierDifference: number
): boolean {
  const tier1 = getRevenueTierIndex(range1);
  const tier2 = getRevenueTierIndex(range2);

  if (tier1 === -1 || tier2 === -1) return false;

  return Math.abs(tier1 - tier2) <= maxTierDifference;
}

/**
 * Calculate similarity score between two businesses
 * Higher score = more similar (0-1 range)
 *
 * Scoring weights:
 * - Industry match: Required (returns 0 if no match)
 * - Revenue match: 0.3
 * - Product types similarity: 0.4
 * - Platform match: 0.3
 */
export function calculateSimilarityScore(
  business: BusinessProfile,
  candidate: BusinessProfile
): SimilarityScore {
  const industryMatch = business.industry === candidate.industry;
  const revenueMatch = isRevenueRangeWithinTiers(
    business.revenueRange,
    candidate.revenueRange,
    1
  );
  const productTypesSimilarity = calculateJaccardSimilarity(
    business.productTypes,
    candidate.productTypes
  );
  const platformMatch = business.platform === candidate.platform;

  // Industry must match - if not, score is 0
  if (!industryMatch) {
    return {
      businessId: candidate.id,
      score: 0,
      industryMatch: false,
      revenueMatch: false,
      productTypesSimilarity: 0,
      platformMatch: false,
    };
  }

  // Calculate weighted score
  const score =
    (revenueMatch ? 0.3 : 0) +
    productTypesSimilarity * 0.4 +
    (platformMatch ? 0.3 : 0);

  return {
    businessId: candidate.id,
    score,
    industryMatch,
    revenueMatch,
    productTypesSimilarity,
    platformMatch,
  };
}

/**
 * Find similar businesses using tiered matching strategy
 * Implements AC #1 and AC #3 (minimum peer group size)
 *
 * Strategy progression:
 * 1. Strict: Exact matches with high similarity
 * 2. Relaxed: Allow ±1 revenue tier, lower similarity threshold
 * 3. Broad: Allow ±2 revenue tiers
 * 4. Fallback: Industry only (if still too few matches)
 */
export async function findSimilarBusinesses(
  business: BusinessProfile
): Promise<{ matches: BusinessProfile[]; criteria: MatchCriteria }> {
  const allBusinesses = await prisma.business.findMany({
    where: {
      id: { not: business.id }, // Exclude self
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

  console.log(
    `[BusinessMatcher] Finding matches for business ${business.id}, total candidates: ${allBusinesses.length}`
  );

  // Tier 1: Strict matching
  let matches = allBusinesses.filter((candidate) => {
    const industryMatch = candidate.industry === business.industry;
    const revenueMatch = candidate.revenueRange === business.revenueRange;
    const productSimilarity = calculateJaccardSimilarity(
      business.productTypes,
      candidate.productTypes
    );
    const platformMatch = candidate.platform === business.platform;

    return (
      industryMatch &&
      revenueMatch &&
      productSimilarity >= 0.5 &&
      platformMatch
    );
  });

  if (matches.length >= MIN_PEER_GROUP_SIZE) {
    console.log(`[BusinessMatcher] Strict tier matched ${matches.length} businesses`);
    return {
      matches,
      criteria: {
        industry: business.industry,
        revenueRange: business.revenueRange,
        productTypes: business.productTypes,
        platform: business.platform,
        tier: "strict",
      },
    };
  }

  // Tier 2: Relaxed matching (±1 revenue tier, lower product similarity)
  matches = allBusinesses.filter((candidate) => {
    const industryMatch = candidate.industry === business.industry;
    const revenueMatch = isRevenueRangeWithinTiers(
      business.revenueRange,
      candidate.revenueRange,
      1
    );
    const productSimilarity = calculateJaccardSimilarity(
      business.productTypes,
      candidate.productTypes
    );

    return industryMatch && revenueMatch && productSimilarity >= 0.3;
  });

  if (matches.length >= MIN_PEER_GROUP_SIZE) {
    console.log(`[BusinessMatcher] Relaxed tier matched ${matches.length} businesses`);
    return {
      matches,
      criteria: {
        industry: business.industry,
        revenueRange: business.revenueRange,
        productTypes: business.productTypes,
        platform: business.platform,
        tier: "relaxed",
      },
    };
  }

  // Tier 3: Broad matching (±2 revenue tiers)
  matches = allBusinesses.filter((candidate) => {
    const industryMatch = candidate.industry === business.industry;
    const revenueMatch = isRevenueRangeWithinTiers(
      business.revenueRange,
      candidate.revenueRange,
      2
    );

    return industryMatch && revenueMatch;
  });

  if (matches.length >= MIN_PEER_GROUP_SIZE) {
    console.log(`[BusinessMatcher] Broad tier matched ${matches.length} businesses`);
    return {
      matches,
      criteria: {
        industry: business.industry,
        revenueRange: business.revenueRange,
        productTypes: business.productTypes,
        platform: business.platform,
        tier: "broad",
      },
    };
  }

  // Tier 4: Fallback - industry only (accept smaller group if still <MIN_PEER_GROUP_SIZE)
  matches = allBusinesses.filter(
    (candidate) => candidate.industry === business.industry
  );

  console.log(
    `[BusinessMatcher] Fallback tier matched ${matches.length} businesses (industry only)`
  );

  // If still no matches, return empty with fallback criteria
  if (matches.length < MINIMUM_ACCEPTABLE_PEER_GROUP_SIZE) {
    console.warn(
      `[BusinessMatcher] Insufficient matches (${matches.length}), minimum is ${MINIMUM_ACCEPTABLE_PEER_GROUP_SIZE}`
    );
  }

  return {
    matches,
    criteria: {
      industry: business.industry,
      revenueRange: business.revenueRange,
      productTypes: business.productTypes,
      platform: business.platform,
      tier: "fallback",
    },
  };
}

/**
 * Calculate and create peer group for a business (AC #2, #5)
 * Performance target: <500ms execution time
 *
 * @param businessId - Business ID to calculate peer group for
 * @returns Peer group calculation result with peer group ID and match details
 */
export async function calculatePeerGroup(
  businessId: string
): Promise<PeerGroupCalculationResult> {
  const startTime = Date.now();

  console.log(`[BusinessMatcher] Starting peer group calculation for business ${businessId}`);

  // 1. Get business profile
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
    throw new Error(`Business not found: ${businessId}`);
  }

  // 2. Find similar businesses using tiered matching
  const { matches, criteria } = await findSimilarBusinesses(business);

  // 3. Calculate similarity scores for all matches
  const scores = matches.map((match) =>
    calculateSimilarityScore(business, match)
  );

  // 4. Sort by similarity score (descending)
  const sortedMatches = matches
    .map((match, index) => ({ match, score: scores[index] }))
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, 50); // Limit to top 50 peers for performance

  const businessIds = [
    business.id,
    ...sortedMatches.map((m) => m.match.id),
  ];

  // 5. Create new peer group
  // Note: We create a new peer group each time rather than reusing existing ones
  // This ensures each business has its own peer group record with current matching criteria
  const peerGroup = await prisma.peerGroup.create({
    data: {
      criteria: criteria as any, // Json type
      businessIds,
    },
  });

  const peerGroupId = peerGroup.id;
  console.log(`[BusinessMatcher] Created new peer group ${peerGroupId} with ${businessIds.length} businesses`);

  // 6. Update business with peer group ID
  await prisma.business.update({
    where: { id: businessId },
    data: { peerGroupId },
  });

  const executionTime = Date.now() - startTime;
  console.log(
    `[BusinessMatcher] Peer group calculation completed in ${executionTime}ms (target: <500ms)`
  );

  if (executionTime > 500) {
    console.warn(
      `[BusinessMatcher] Performance warning: execution time ${executionTime}ms exceeds 500ms target`
    );
  }

  return {
    peerGroupId,
    businessIds,
    matchCriteria: criteria,
    matchCount: businessIds.length - 1, // Exclude self
  };
}

/**
 * Recalculate peer groups for businesses in a specific industry
 * Used when a new business joins to update affected peer groups
 *
 * @param industry - Industry to recalculate peer groups for
 * @param excludeBusinessId - Optional business ID to exclude from recalculation
 */
export async function recalculatePeerGroupsForIndustry(
  industry: string,
  excludeBusinessId?: string
): Promise<{ recalculated: number; errors: number }> {
  console.log(`[BusinessMatcher] Recalculating peer groups for industry: ${industry}`);

  const businesses = await prisma.business.findMany({
    where: {
      industry,
      id: excludeBusinessId ? { not: excludeBusinessId } : undefined,
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

  console.log(`[BusinessMatcher] Found ${businesses.length} businesses to recalculate`);

  let recalculated = 0;
  let errors = 0;

  for (const business of businesses) {
    try {
      await calculatePeerGroup(business.id);
      recalculated++;
    } catch (error) {
      console.error(
        `[BusinessMatcher] Failed to recalculate peer group for business ${business.id}:`,
        error
      );
      errors++;
    }
  }

  console.log(
    `[BusinessMatcher] Recalculation complete: ${recalculated} successful, ${errors} errors`
  );

  return { recalculated, errors };
}
