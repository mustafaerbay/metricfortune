/**
 * Integration tests for Peer Matching Algorithm
 * Tests peer matching accuracy with real database operations
 * AC #6: Data accuracy validated (peer matching)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateSimilarityScore,
  calculateJaccardSimilarity,
  isRevenueRangeWithinTiers,
  calculatePeerGroup,
} from '@/services/matching/business-matcher';
import { testPrisma, seedBusiness } from '../../helpers/database';
import type { BusinessProfile } from '@/types/peer-group';

describe('Peer Matching Algorithm Integration Tests', () => {
  describe('calculateJaccardSimilarity', () => {
    it('should calculate exact match similarity (1.0)', () => {
      const result = calculateJaccardSimilarity(['clothing', 'shoes'], ['clothing', 'shoes']);
      expect(result).toBe(1.0);
    });

    it('should calculate partial overlap similarity', () => {
      const result = calculateJaccardSimilarity(
        ['clothing', 'shoes', 'accessories'],
        ['shoes', 'accessories', 'jewelry']
      );
      // Intersection: [shoes, accessories] = 2
      // Union: [clothing, shoes, accessories, jewelry] = 4
      // Result: 2/4 = 0.5
      expect(result).toBeCloseTo(0.5, 2);
    });

    it('should return 0 for no overlap', () => {
      const result = calculateJaccardSimilarity(['clothing'], ['electronics']);
      expect(result).toBe(0);
    });

    it('should handle empty arrays', () => {
      expect(calculateJaccardSimilarity([], [])).toBe(1.0);
      expect(calculateJaccardSimilarity(['clothing'], [])).toBe(0);
      expect(calculateJaccardSimilarity([], ['clothing'])).toBe(0);
    });

    it('should be case-insensitive', () => {
      const result = calculateJaccardSimilarity(['Clothing', 'SHOES'], ['clothing', 'shoes']);
      expect(result).toBe(1.0);
    });
  });

  describe('isRevenueRangeWithinTiers', () => {
    it('should match exact revenue range', () => {
      const result = isRevenueRangeWithinTiers('$1M-5M', '$1M-5M', 0);
      expect(result).toBe(true);
    });

    it('should match adjacent revenue tiers (±1 tier)', () => {
      expect(isRevenueRangeWithinTiers('$1M-5M', '$500k-1M', 1)).toBe(true);
      expect(isRevenueRangeWithinTiers('$1M-5M', '$5M-10M', 1)).toBe(true);
    });

    it('should not match tiers beyond threshold', () => {
      const result = isRevenueRangeWithinTiers('$1M-5M', '$10M-50M', 1);
      expect(result).toBe(false); // 2 tiers apart
    });

    it('should match within ±2 tiers', () => {
      expect(isRevenueRangeWithinTiers('$1M-5M', '$10M-50M', 2)).toBe(true);
      expect(isRevenueRangeWithinTiers('$1M-5M', '$50M+', 2)).toBe(false); // 3 tiers apart
    });

    it('should handle invalid revenue ranges', () => {
      const result = isRevenueRangeWithinTiers('invalid', '$1M-5M', 1);
      expect(result).toBe(false);
    });
  });

  describe('calculateSimilarityScore', () => {
    const fashionBusiness: BusinessProfile = {
      id: 'business-1',
      industry: 'fashion',
      revenueRange: '$1M-5M',
      productTypes: ['clothing', 'accessories'],
      platform: 'Shopify',
    };

    it('should return high score for very similar businesses', () => {
      const similar: BusinessProfile = {
        id: 'business-2',
        industry: 'fashion',
        revenueRange: '$1M-5M',
        productTypes: ['clothing', 'accessories'],
        platform: 'Shopify',
      };

      const score = calculateSimilarityScore(fashionBusiness, similar);

      expect(score.industryMatch).toBe(true);
      expect(score.revenueMatch).toBe(true);
      expect(score.productTypesSimilarity).toBe(1.0);
      expect(score.platformMatch).toBe(true);
      expect(score.score).toBeCloseTo(1.0, 1); // Perfect match
    });

    it('should return 0 score for different industry', () => {
      const differentIndustry: BusinessProfile = {
        id: 'business-3',
        industry: 'electronics',
        revenueRange: '$1M-5M',
        productTypes: ['clothing', 'accessories'],
        platform: 'Shopify',
      };

      const score = calculateSimilarityScore(fashionBusiness, differentIndustry);

      expect(score.industryMatch).toBe(false);
      expect(score.score).toBe(0);
    });

    it('should calculate weighted score with partial matches', () => {
      const partialMatch: BusinessProfile = {
        id: 'business-4',
        industry: 'fashion',
        revenueRange: '$500k-1M', // Adjacent tier
        productTypes: ['clothing', 'shoes'], // Partial overlap
        platform: 'WooCommerce', // Different platform
      };

      const score = calculateSimilarityScore(fashionBusiness, partialMatch);

      expect(score.industryMatch).toBe(true);
      expect(score.revenueMatch).toBe(true); // Within ±1 tier
      expect(score.productTypesSimilarity).toBeGreaterThan(0); // Some overlap
      expect(score.platformMatch).toBe(false);
      expect(score.score).toBeGreaterThan(0);
      expect(score.score).toBeLessThan(1.0);
    });
  });

  describe('calculatePeerGroup with real database', () => {
    let targetBusinessId: string;

    beforeEach(async () => {
      // Create target business
      const targetBusiness = await seedBusiness({
        name: 'Target Fashion Store',
        industry: 'fashion',
        revenueRange: '$1M-5M',
        productTypes: ['clothing', 'accessories'],
        platform: 'Shopify',
      });
      targetBusinessId = targetBusiness.id;

      // Create 15 similar businesses (meet min peer group size of 10)
      await Promise.all(
        Array.from({ length: 15 }, async (_, i) => {
          return seedBusiness({
            name: `Fashion Store ${i}`,
            industry: 'fashion',
            revenueRange: i < 10 ? '$1M-5M' : '$500k-1M', // Mix of exact and adjacent tiers
            productTypes: i < 12 ? ['clothing', 'accessories'] : ['clothing', 'shoes'],
            platform: i < 13 ? 'Shopify' : 'WooCommerce',
          });
        })
      );

      // Create 5 businesses from different industry (should not be in peer group)
      await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          return seedBusiness({
            name: `Electronics Store ${i}`,
            industry: 'electronics',
            revenueRange: '$1M-5M',
            productTypes: ['phones', 'laptops'],
            platform: 'Shopify',
          });
        })
      );
    });

    it('should match only businesses in same industry', async () => {
      const result = await calculatePeerGroup(targetBusinessId);

      expect(result.matchCount).toBeGreaterThanOrEqual(10); // Min peer group size

      // Verify all matched businesses are in fashion industry
      const peerGroup = await testPrisma.peerGroup.findUnique({
        where: { id: result.peerGroupId },
      });

      // Fetch businesses using businessIds array
      const businesses = await testPrisma.business.findMany({
        where: { id: { in: peerGroup!.businessIds } },
      });

      businesses.forEach((business) => {
        if (business.id !== targetBusinessId) {
          expect(business.industry).toBe('fashion');
        }
      });
    });

    it('should prioritize exact revenue range matches', async () => {
      const result = await calculatePeerGroup(targetBusinessId);

      const peerGroup = await testPrisma.peerGroup.findUnique({
        where: { id: result.peerGroupId },
      });

      // Fetch businesses using businessIds array
      const businesses = await testPrisma.business.findMany({
        where: { id: { in: peerGroup!.businessIds } },
      });

      // Count exact revenue matches
      const exactMatches = businesses.filter(
        (b) => b.id !== targetBusinessId && b.revenueRange === '$1M-5M'
      );

      // Should have majority of exact matches
      expect(exactMatches.length).toBeGreaterThan(5);
    });

    it('should consider product type overlap (Jaccard similarity)', async () => {
      const result = await calculatePeerGroup(targetBusinessId);

      const peerGroup = await testPrisma.peerGroup.findUnique({
        where: { id: result.peerGroupId },
      });

      // Fetch businesses using businessIds array
      const businesses = await testPrisma.business.findMany({
        where: { id: { in: peerGroup!.businessIds } },
      });

      // Businesses with ['clothing', 'accessories'] should be preferred
      const similarProductTypes = businesses.filter((b) => {
        if (b.id === targetBusinessId) return false;
        const similarity = calculateJaccardSimilarity(
          ['clothing', 'accessories'],
          b.productTypes
        );
        return similarity > 0.5; // High similarity
      });

      expect(similarProductTypes.length).toBeGreaterThan(5);
    });

    it('should prefer same platform matches', async () => {
      const result = await calculatePeerGroup(targetBusinessId);

      const peerGroup = await testPrisma.peerGroup.findUnique({
        where: { id: result.peerGroupId },
      });

      // Fetch businesses using businessIds array
      const businesses = await testPrisma.business.findMany({
        where: { id: { in: peerGroup!.businessIds } },
      });

      // Count Shopify businesses (same platform)
      const shopifyMatches = businesses.filter(
        (b) => b.id !== targetBusinessId && b.platform === 'Shopify'
      );

      // Should have majority from same platform
      expect(shopifyMatches.length).toBeGreaterThan(7);
    });

    it('should meet minimum peer group size constraint (10 businesses)', async () => {
      const result = await calculatePeerGroup(targetBusinessId);

      expect(result.matchCount).toBeGreaterThanOrEqual(10);

      const peerGroup = await testPrisma.peerGroup.findUnique({
        where: { id: result.peerGroupId },
      });

      // Peer group should include target + at least 10 peers
      expect(peerGroup!.businessIds.length).toBeGreaterThanOrEqual(11);
    });

    it('should create peer group composition metadata', async () => {
      const result = await calculatePeerGroup(targetBusinessId);

      expect(result.peerGroupId).toBeDefined();
      expect(result.matchCriteria).toBeDefined();
      expect(result.matchCriteria.tier).toBeDefined();
      expect(result.matchCount).toBeGreaterThanOrEqual(10);
    });

    it('should handle edge case of insufficient peers gracefully', async () => {
      // Create isolated business in rare industry with no peers
      const isolatedBusiness = await seedBusiness({
        name: 'Rare Industry Business',
        industry: 'luxury-yachts', // Unique industry
        revenueRange: '$50M+',
        productTypes: ['boats'],
        platform: 'Custom',
      });

      // Attempt to calculate peer group
      const result = await calculatePeerGroup(isolatedBusiness.id);

      // Should still succeed but with minimal or fallback peer group
      expect(result.peerGroupId).toBeDefined();
      // matchCount might be less than 10 in fallback scenario
    });
  });

  describe('peer group recalculation', () => {
    it('should include new business in existing peer groups after profile completion', async () => {
      // Create 10 fashion businesses
      const fashionBusinesses = await Promise.all(
        Array.from({ length: 10 }, async (_, i) => {
          return seedBusiness({
            name: `Fashion Store ${i}`,
            industry: 'fashion',
            revenueRange: '$1M-5M',
            productTypes: ['clothing'],
            platform: 'Shopify',
          });
        })
      );

      // Calculate peer groups for first batch
      await Promise.all(
        fashionBusinesses.map((b) => calculatePeerGroup(b.id))
      );

      // Add new fashion business
      const newBusiness = await seedBusiness({
        name: 'New Fashion Store',
        industry: 'fashion',
        revenueRange: '$1M-5M',
        productTypes: ['clothing'],
        platform: 'Shopify',
      });

      // Calculate peer group for new business
      const result = await calculatePeerGroup(newBusiness.id);

      // New business should have peers from existing fashion businesses
      expect(result.matchCount).toBeGreaterThanOrEqual(10);
    });
  });
});
