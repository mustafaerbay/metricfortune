/**
 * Type definitions for peer group matching and composition
 * Used by business-matcher service and peer group Server Actions
 */

/**
 * Matching criteria used to find similar businesses
 */
export interface MatchCriteria {
  industry: string;
  revenueRange: string;
  productTypes: string[];
  platform: string;
  tier: "strict" | "relaxed" | "broad" | "fallback";
}

/**
 * Similarity score for a matched business
 */
export interface SimilarityScore {
  businessId: string;
  score: number; // 0-1, higher is more similar
  industryMatch: boolean;
  revenueMatch: boolean;
  productTypesSimilarity: number; // Jaccard coefficient
  platformMatch: boolean;
}

/**
 * Peer group composition data (public-facing)
 */
export interface PeerGroupData {
  peerCount: number;
  industries: string[];
  revenueRanges: string[];
  platforms: string[];
  matchCriteria: MatchCriteria;
}

/**
 * Detailed peer group data (admin-only debugging)
 */
export interface DetailedPeerGroup extends PeerGroupData {
  businessIds: string[];
  similarityScores: SimilarityScore[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Business profile data for matching
 * Subset of Prisma Business model
 */
export interface BusinessProfile {
  id: string;
  industry: string;
  revenueRange: string;
  productTypes: string[];
  platform: string;
  peerGroupId: string | null;
}

/**
 * Result of peer group calculation
 */
export interface PeerGroupCalculationResult {
  peerGroupId: string;
  businessIds: string[];
  matchCriteria: MatchCriteria;
  matchCount: number;
}
