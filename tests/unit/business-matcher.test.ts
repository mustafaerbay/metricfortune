import { describe, it, expect } from "vitest";
import {
  calculateJaccardSimilarity,
  isRevenueRangeWithinTiers,
  calculateSimilarityScore,
} from "@/services/matching/business-matcher";
import type { BusinessProfile } from "@/types/peer-group";

describe("Business Matching Algorithm", () => {
  describe("calculateJaccardSimilarity", () => {
    it("should return 1.0 for identical sets", () => {
      const setA = ["clothing", "accessories"];
      const setB = ["clothing", "accessories"];
      const similarity = calculateJaccardSimilarity(setA, setB);
      expect(similarity).toBe(1.0);
    });

    it("should return 0.0 for completely different sets", () => {
      const setA = ["clothing"];
      const setB = ["electronics"];
      const similarity = calculateJaccardSimilarity(setA, setB);
      expect(similarity).toBe(0.0);
    });

    it("should calculate correct similarity for partial overlap", () => {
      const setA = ["clothing", "accessories", "shoes"];
      const setB = ["accessories", "shoes", "jewelry"];
      // Intersection: [accessories, shoes] = 2
      // Union: [clothing, accessories, shoes, jewelry] = 4
      // Jaccard: 2/4 = 0.5
      const similarity = calculateJaccardSimilarity(setA, setB);
      expect(similarity).toBe(0.5);
    });

    it("should be case-insensitive", () => {
      const setA = ["Clothing", "ACCESSORIES"];
      const setB = ["clothing", "accessories"];
      const similarity = calculateJaccardSimilarity(setA, setB);
      expect(similarity).toBe(1.0);
    });

    it("should return 1.0 for both empty sets", () => {
      const similarity = calculateJaccardSimilarity([], []);
      expect(similarity).toBe(1.0);
    });

    it("should return 0.0 when one set is empty", () => {
      const similarity1 = calculateJaccardSimilarity(["clothing"], []);
      const similarity2 = calculateJaccardSimilarity([], ["clothing"]);
      expect(similarity1).toBe(0.0);
      expect(similarity2).toBe(0.0);
    });

    it("should handle duplicate items in sets", () => {
      const setA = ["clothing", "clothing", "accessories"];
      const setB = ["clothing", "accessories", "accessories"];
      // Should treat as unique sets: [clothing, accessories]
      const similarity = calculateJaccardSimilarity(setA, setB);
      expect(similarity).toBe(1.0);
    });

    it("should calculate similarity for realistic product types", () => {
      const setA = ["Physical Products", "Digital Downloads", "Subscriptions"];
      const setB = ["Physical Products", "Digital Downloads"];
      // Intersection: 2, Union: 3, Jaccard: 2/3 ≈ 0.667
      const similarity = calculateJaccardSimilarity(setA, setB);
      expect(similarity).toBeCloseTo(0.667, 2);
    });
  });

  describe("isRevenueRangeWithinTiers", () => {
    it("should match exact same tier", () => {
      const result = isRevenueRangeWithinTiers("$1M-5M", "$1M-5M", 0);
      expect(result).toBe(true);
    });

    it("should match adjacent tiers within ±1", () => {
      expect(isRevenueRangeWithinTiers("$1M-5M", "$500k-1M", 1)).toBe(true);
      expect(isRevenueRangeWithinTiers("$1M-5M", "$5M-10M", 1)).toBe(true);
    });

    it("should not match tiers more than ±1 apart", () => {
      expect(isRevenueRangeWithinTiers("$1M-5M", "$100k-500k", 1)).toBe(false);
      expect(isRevenueRangeWithinTiers("$1M-5M", "$10M-50M", 1)).toBe(false);
    });

    it("should match tiers within ±2", () => {
      expect(isRevenueRangeWithinTiers("$1M-5M", "$100k-500k", 2)).toBe(true);
      expect(isRevenueRangeWithinTiers("$1M-5M", "$10M-50M", 2)).toBe(true);
    });

    it("should handle edge tiers correctly", () => {
      expect(isRevenueRangeWithinTiers("$0-100k", "$100k-500k", 1)).toBe(true);
      expect(isRevenueRangeWithinTiers("$50M+", "$10M-50M", 1)).toBe(true);
    });

    it("should return false for invalid revenue ranges", () => {
      expect(isRevenueRangeWithinTiers("invalid", "$1M-5M", 1)).toBe(false);
      expect(isRevenueRangeWithinTiers("$1M-5M", "invalid", 1)).toBe(false);
    });

    it("should validate full tier spectrum", () => {
      // Test all valid tiers
      const validTiers = [
        "$0-100k",
        "$100k-500k",
        "$500k-1M",
        "$1M-5M",
        "$5M-10M",
        "$10M-50M",
        "$50M+",
      ];

      // Each tier should match itself
      validTiers.forEach((tier) => {
        expect(isRevenueRangeWithinTiers(tier, tier, 0)).toBe(true);
      });
    });
  });

  describe("calculateSimilarityScore", () => {
    it("should return 0 score for different industries", () => {
      const business: BusinessProfile = {
        id: "1",
        industry: "Fashion",
        revenueRange: "$1M-5M",
        productTypes: ["Physical Products"],
        platform: "Shopify",
        peerGroupId: null,
      };

      const candidate: BusinessProfile = {
        id: "2",
        industry: "Electronics",
        revenueRange: "$1M-5M",
        productTypes: ["Physical Products"],
        platform: "Shopify",
        peerGroupId: null,
      };

      const score = calculateSimilarityScore(business, candidate);
      expect(score.score).toBe(0);
      expect(score.industryMatch).toBe(false);
    });

    it("should calculate high score for exact matches", () => {
      const business: BusinessProfile = {
        id: "1",
        industry: "Fashion",
        revenueRange: "$1M-5M",
        productTypes: ["Physical Products", "Digital Downloads"],
        platform: "Shopify",
        peerGroupId: null,
      };

      const candidate: BusinessProfile = {
        id: "2",
        industry: "Fashion",
        revenueRange: "$1M-5M",
        productTypes: ["Physical Products", "Digital Downloads"],
        platform: "Shopify",
        peerGroupId: null,
      };

      const score = calculateSimilarityScore(business, candidate);
      expect(score.score).toBe(1.0); // 0.3 (revenue) + 0.4 (products) + 0.3 (platform)
      expect(score.industryMatch).toBe(true);
      expect(score.revenueMatch).toBe(true);
      expect(score.productTypesSimilarity).toBe(1.0);
      expect(score.platformMatch).toBe(true);
    });

    it("should score partial matches correctly", () => {
      const business: BusinessProfile = {
        id: "1",
        industry: "Fashion",
        revenueRange: "$1M-5M",
        productTypes: ["Physical Products", "Digital Downloads"],
        platform: "Shopify",
        peerGroupId: null,
      };

      const candidate: BusinessProfile = {
        id: "2",
        industry: "Fashion",
        revenueRange: "$500k-1M", // Adjacent tier
        productTypes: ["Physical Products"], // 50% overlap
        platform: "WooCommerce", // Different
        peerGroupId: null,
      };

      const score = calculateSimilarityScore(business, candidate);
      // 0.3 (revenue match) + 0.4 * 0.5 (product similarity) + 0 (platform) = 0.5
      expect(score.score).toBeCloseTo(0.5, 1);
      expect(score.industryMatch).toBe(true);
      expect(score.revenueMatch).toBe(true);
      expect(score.platformMatch).toBe(false);
    });

    it("should handle no product type overlap", () => {
      const business: BusinessProfile = {
        id: "1",
        industry: "Fashion",
        revenueRange: "$1M-5M",
        productTypes: ["Physical Products"],
        platform: "Shopify",
        peerGroupId: null,
      };

      const candidate: BusinessProfile = {
        id: "2",
        industry: "Fashion",
        revenueRange: "$1M-5M",
        productTypes: ["Digital Downloads"],
        platform: "Shopify",
        peerGroupId: null,
      };

      const score = calculateSimilarityScore(business, candidate);
      // 0.3 (revenue) + 0.4 * 0 (no product overlap) + 0.3 (platform) = 0.6
      expect(score.score).toBeCloseTo(0.6, 1);
      expect(score.productTypesSimilarity).toBe(0);
    });

    it("should prioritize industry match requirement", () => {
      const business: BusinessProfile = {
        id: "1",
        industry: "Fashion",
        revenueRange: "$1M-5M",
        productTypes: ["Physical Products"],
        platform: "Shopify",
        peerGroupId: null,
      };

      const candidate: BusinessProfile = {
        id: "2",
        industry: "Technology", // Different industry
        revenueRange: "$1M-5M", // Same revenue
        productTypes: ["Physical Products"], // Same products
        platform: "Shopify", // Same platform
        peerGroupId: null,
      };

      const score = calculateSimilarityScore(business, candidate);
      // Should be 0 because industry doesn't match
      expect(score.score).toBe(0);
      expect(score.industryMatch).toBe(false);
    });

    it("should score realistic e-commerce business matches", () => {
      const business: BusinessProfile = {
        id: "1",
        industry: "Fashion & Apparel",
        revenueRange: "$1M-5M",
        productTypes: ["Physical Products", "Subscriptions"],
        platform: "Shopify",
        peerGroupId: null,
      };

      const candidate1: BusinessProfile = {
        id: "2",
        industry: "Fashion & Apparel",
        revenueRange: "$5M-10M", // Adjacent tier
        productTypes: ["Physical Products", "Digital Downloads"],
        platform: "Shopify",
        peerGroupId: null,
      };

      const score1 = calculateSimilarityScore(business, candidate1);
      // Industry match ✓
      // Revenue match ✓ (±1 tier)
      // Product similarity: 1/3 = 0.333 (intersection: Physical Products)
      // Platform match ✓
      // Score: 0.3 + 0.4*0.333 + 0.3 ≈ 0.73
      expect(score1.score).toBeCloseTo(0.73, 1);
      expect(score1.industryMatch).toBe(true);
      expect(score1.revenueMatch).toBe(true);
      expect(score1.platformMatch).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle business with empty product types", () => {
      const business: BusinessProfile = {
        id: "1",
        industry: "Fashion",
        revenueRange: "$1M-5M",
        productTypes: [],
        platform: "Shopify",
        peerGroupId: null,
      };

      const candidate: BusinessProfile = {
        id: "2",
        industry: "Fashion",
        revenueRange: "$1M-5M",
        productTypes: ["Physical Products"],
        platform: "Shopify",
        peerGroupId: null,
      };

      const score = calculateSimilarityScore(business, candidate);
      // Should handle gracefully with 0 product similarity
      expect(score.productTypesSimilarity).toBe(0);
      expect(score.score).toBeCloseTo(0.6, 1); // 0.3 + 0 + 0.3
    });

    it("should handle both businesses with empty product types", () => {
      const business: BusinessProfile = {
        id: "1",
        industry: "Fashion",
        revenueRange: "$1M-5M",
        productTypes: [],
        platform: "Shopify",
        peerGroupId: null,
      };

      const candidate: BusinessProfile = {
        id: "2",
        industry: "Fashion",
        revenueRange: "$1M-5M",
        productTypes: [],
        platform: "Shopify",
        peerGroupId: null,
      };

      const score = calculateSimilarityScore(business, candidate);
      // Empty sets should be considered identical
      expect(score.productTypesSimilarity).toBe(1.0);
      expect(score.score).toBe(1.0); // 0.3 + 0.4 + 0.3
    });
  });
});
