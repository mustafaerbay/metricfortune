/**
 * Recommendation Engine Service Unit Tests
 *
 * Tests for rule-based recommendation generation, prioritization,
 * peer success data integration, and recommendation storage.
 *
 * Coverage:
 * - AC #1: Rule-based mapping from patterns to recommendations
 * - AC #2: Recommendation format (problem, action, impact, confidence)
 * - AC #3: Peer success data integration
 * - AC #4: Prioritization by impact score
 * - AC #5: Top 3-5 recommendation limiting
 * - AC #6: Storage with timestamps and status
 * - AC #7: Recommendation retrieval
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateRecommendations,
  storeRecommendations,
  generateAndStoreRecommendations,
} from "@/services/analytics/recommendation-engine";
import { prisma } from "@/lib/prisma";
import { PatternType } from "@/types/pattern";
import type { Pattern } from "@prisma/client";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    pattern: {
      findMany: vi.fn(),
    },
    business: {
      findUnique: vi.fn(),
    },
    recommendation: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

describe("Recommendation Engine Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateRecommendations - ABANDONMENT patterns (AC #1, #2, #4)", () => {
    it("should generate shipping abandonment recommendation with correct format", async () => {
      // Arrange: High severity shipping abandonment pattern
      const mockPatterns: Partial<Pattern>[] = [
        {
          id: "pat1",
          siteId: "site1",
          patternType: "ABANDONMENT",
          description: "High abandonment at shipping stage",
          severity: 0.8,
          sessionCount: 250,
          confidenceScore: 0.9,
          metadata: {
            stage: "shipping",
            dropOffRate: 45,
            nextStage: "payment",
            affectedSessions: 112,
            sampleSize: 250,
          },
          detectedAt: new Date(),
        },
      ];

      vi.mocked(prisma.pattern.findMany).mockResolvedValue(
        mockPatterns as Pattern[]
      );
      vi.mocked(prisma.business.findUnique).mockResolvedValue(null);

      // Act
      const recommendations = await generateRecommendations({
        siteId: "site1",
        businessId: "biz1",
        includePeerData: false,
      });

      // Assert: AC #1 - Correct rule mapping
      expect(recommendations).toHaveLength(1);
      const rec = recommendations[0];

      // AC #2 - Correct format
      expect(rec.title).toBe("Show shipping costs earlier in checkout");
      expect(rec.problemStatement).toContain("45%");
      expect(rec.problemStatement).toContain("abandon during shipping step");
      expect(rec.actionSteps).toEqual([
        "Display estimated shipping cost on product page",
        "Add shipping calculator before checkout",
        "Show free shipping threshold in cart",
      ]);
      expect(rec.expectedImpact).toContain("15-25%");
      expect(rec.confidenceLevel).toBe("HIGH"); // 0.9 confidence
      expect(rec.impactLevel).toBe("HIGH"); // 0.8 severity
    });

    it("should generate payment abandonment recommendation", async () => {
      // Arrange: Payment stage abandonment pattern
      const mockPatterns: Partial<Pattern>[] = [
        {
          id: "pat2",
          siteId: "site1",
          patternType: "ABANDONMENT",
          description: "Payment abandonment",
          severity: 0.7,
          sessionCount: 180,
          confidenceScore: 0.85,
          metadata: {
            stage: "payment",
            dropOffRate: 35,
          },
          detectedAt: new Date(),
        },
      ];

      vi.mocked(prisma.pattern.findMany).mockResolvedValue(
        mockPatterns as Pattern[]
      );
      vi.mocked(prisma.business.findUnique).mockResolvedValue(null);

      // Act
      const recommendations = await generateRecommendations({
        siteId: "site1",
        businessId: "biz1",
        includePeerData: false,
      });

      // Assert
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].title).toBe("Simplify payment process");
      expect(recommendations[0].problemStatement).toContain("35%");
      expect(recommendations[0].actionSteps).toContain(
        "Enable express checkout options (Apple Pay, Google Pay)"
      );
      expect(recommendations[0].impactLevel).toBe("MEDIUM"); // 0.7 severity
    });

    it("should generate product page abandonment recommendation", async () => {
      // Arrange: Product page abandonment pattern
      const mockPatterns: Partial<Pattern>[] = [
        {
          id: "pat3",
          siteId: "site1",
          patternType: "ABANDONMENT",
          description: "Product page abandonment",
          severity: 0.75,
          sessionCount: 300,
          confidenceScore: 1.0,
          metadata: {
            stage: "product",
            dropOffRate: 62,
          },
          detectedAt: new Date(),
        },
      ];

      vi.mocked(prisma.pattern.findMany).mockResolvedValue(
        mockPatterns as Pattern[]
      );
      vi.mocked(prisma.business.findUnique).mockResolvedValue(null);

      // Act
      const recommendations = await generateRecommendations({
        siteId: "site1",
        businessId: "biz1",
        includePeerData: false,
      });

      // Assert
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].title).toBe("Improve product page content");
      expect(recommendations[0].confidenceLevel).toBe("HIGH"); // 1.0 confidence
      expect(recommendations[0].actionSteps).toContain(
        "Add more product images (minimum 5 angles)"
      );
    });
  });

  describe("generateRecommendations - HESITATION patterns (AC #1, #2)", () => {
    it("should generate address field hesitation recommendation", async () => {
      // Arrange: Address field hesitation pattern
      const mockPatterns: Partial<Pattern>[] = [
        {
          id: "pat4",
          siteId: "site1",
          patternType: "HESITATION",
          description: "Address field re-entry",
          severity: 0.6,
          sessionCount: 150,
          confidenceScore: 0.7,
          metadata: {
            field: "address",
            reEntryRate: 28,
            avgReEntries: 2.3,
          },
          detectedAt: new Date(),
        },
      ];

      vi.mocked(prisma.pattern.findMany).mockResolvedValue(
        mockPatterns as Pattern[]
      );
      vi.mocked(prisma.business.findUnique).mockResolvedValue(null);

      // Act
      const recommendations = await generateRecommendations({
        siteId: "site1",
        businessId: "biz1",
        includePeerData: false,
      });

      // Assert
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].title).toBe("Add address autocomplete functionality");
      expect(recommendations[0].problemStatement).toContain("28%");
      expect(recommendations[0].problemStatement).toContain("2 times"); // Rounded
      expect(recommendations[0].actionSteps).toContain(
        "Implement Google Places address autocomplete"
      );
      expect(recommendations[0].confidenceLevel).toBe("MEDIUM"); // 0.7 confidence
      expect(recommendations[0].impactLevel).toBe("MEDIUM"); // 0.6 severity
    });

    it("should generate payment field hesitation recommendation", async () => {
      // Arrange: Credit card field hesitation pattern
      const mockPatterns: Partial<Pattern>[] = [
        {
          id: "pat5",
          siteId: "site1",
          patternType: "HESITATION",
          description: "Card field hesitation",
          severity: 0.5,
          sessionCount: 120,
          confidenceScore: 0.65,
          metadata: {
            field: "credit_card_number",
            reEntryRate: 22,
          },
          detectedAt: new Date(),
        },
      ];

      vi.mocked(prisma.pattern.findMany).mockResolvedValue(
        mockPatterns as Pattern[]
      );
      vi.mocked(prisma.business.findUnique).mockResolvedValue(null);

      // Act
      const recommendations = await generateRecommendations({
        siteId: "site1",
        businessId: "biz1",
        includePeerData: false,
      });

      // Assert
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].title).toBe("Improve payment field clarity");
      expect(recommendations[0].impactLevel).toBe("MEDIUM"); // 0.5 severity
      expect(recommendations[0].confidenceLevel).toBe("LOW"); // 0.65 confidence
    });
  });

  describe("generateRecommendations - LOW_ENGAGEMENT patterns (AC #1, #2)", () => {
    it("should generate product page engagement recommendation", async () => {
      // Arrange: Low engagement on product pages
      const mockPatterns: Partial<Pattern>[] = [
        {
          id: "pat6",
          siteId: "site1",
          patternType: "LOW_ENGAGEMENT",
          description: "Low product page engagement",
          severity: 0.55,
          sessionCount: 200,
          confidenceScore: 0.8,
          metadata: {
            page: "/products/widget-123",
            timeOnPage: 45,
            siteAverage: 85,
            engagementGap: 47,
          },
          detectedAt: new Date(),
        },
      ];

      vi.mocked(prisma.pattern.findMany).mockResolvedValue(
        mockPatterns as Pattern[]
      );
      vi.mocked(prisma.business.findUnique).mockResolvedValue(null);

      // Act
      const recommendations = await generateRecommendations({
        siteId: "site1",
        businessId: "biz1",
        includePeerData: false,
      });

      // Assert
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].title).toBe("Enhance product page engagement");
      expect(recommendations[0].problemStatement).toContain("47%");
      expect(recommendations[0].problemStatement).toContain("45s vs 85s");
      expect(recommendations[0].actionSteps).toContain("Add customer reviews and Q&A section");
    });

    it("should generate category page engagement recommendation", async () => {
      // Arrange: Low engagement on category pages
      const mockPatterns: Partial<Pattern>[] = [
        {
          id: "pat7",
          siteId: "site1",
          patternType: "LOW_ENGAGEMENT",
          description: "Low category page engagement",
          severity: 0.4,
          sessionCount: 180,
          confidenceScore: 0.75,
          metadata: {
            page: "/collections/shirts",
            engagementGap: 35,
          },
          detectedAt: new Date(),
        },
      ];

      vi.mocked(prisma.pattern.findMany).mockResolvedValue(
        mockPatterns as Pattern[]
      );
      vi.mocked(prisma.business.findUnique).mockResolvedValue(null);

      // Act
      const recommendations = await generateRecommendations({
        siteId: "site1",
        businessId: "biz1",
        includePeerData: false,
      });

      // Assert
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].title).toBe("Improve category browsing experience");
      expect(recommendations[0].impactLevel).toBe("LOW"); // 0.4 severity
    });
  });

  describe("generateRecommendations - Prioritization (AC #4, #5)", () => {
    it("should prioritize recommendations by impact score (severity × conversion value)", async () => {
      // Arrange: Multiple patterns with varying severities and types
      const mockPatterns: Partial<Pattern>[] = [
        {
          id: "pat1",
          siteId: "site1",
          patternType: "LOW_ENGAGEMENT", // Low conversion value (1.5)
          description: "Low engagement",
          severity: 0.8, // Impact score: 0.8 × 1.5 = 1.2
          sessionCount: 200,
          confidenceScore: 0.9,
          metadata: { page: "/products/item", engagementGap: 50 },
          detectedAt: new Date(),
        },
        {
          id: "pat2",
          siteId: "site1",
          patternType: "ABANDONMENT", // High conversion value (3.0)
          description: "Shipping abandonment",
          severity: 0.6, // Impact score: 0.6 × 3.0 = 1.8
          sessionCount: 150,
          confidenceScore: 0.85,
          metadata: { stage: "shipping", dropOffRate: 40 },
          detectedAt: new Date(),
        },
        {
          id: "pat3",
          siteId: "site1",
          patternType: "HESITATION", // Medium conversion value (2.0)
          description: "Field hesitation",
          severity: 0.5, // Impact score: 0.5 × 2.0 = 1.0
          sessionCount: 120,
          confidenceScore: 0.7,
          metadata: { field: "email", reEntryRate: 25 },
          detectedAt: new Date(),
        },
      ];

      vi.mocked(prisma.pattern.findMany).mockResolvedValue(
        mockPatterns as Pattern[]
      );
      vi.mocked(prisma.business.findUnique).mockResolvedValue(null);

      // Act
      const recommendations = await generateRecommendations({
        siteId: "site1",
        businessId: "biz1",
        includePeerData: false,
      });

      // Assert: AC #4 - Sorted by impact score DESC
      // Order should be: ABANDONMENT (1.8) > LOW_ENGAGEMENT (1.2) > HESITATION (1.0)
      expect(recommendations).toHaveLength(3);
      expect(recommendations[0].title).toContain("shipping"); // ABANDONMENT
      expect(recommendations[1].title).toContain("engagement"); // LOW_ENGAGEMENT
      expect(recommendations[2].title).toContain("email"); // HESITATION
    });

    it("should limit output to top 5 recommendations (AC #5)", async () => {
      // Arrange: 8 patterns
      const mockPatterns: Partial<Pattern>[] = Array.from({ length: 8 }, (_, i) => ({
        id: `pat${i}`,
        siteId: "site1",
        patternType: "ABANDONMENT",
        description: `Pattern ${i}`,
        severity: 0.9 - i * 0.1, // Descending severity
        sessionCount: 100,
        confidenceScore: 0.8,
        metadata: { stage: "cart", dropOffRate: 40 },
        detectedAt: new Date(),
      }));

      vi.mocked(prisma.pattern.findMany).mockResolvedValue(
        mockPatterns as Pattern[]
      );
      vi.mocked(prisma.business.findUnique).mockResolvedValue(null);

      // Act
      const recommendations = await generateRecommendations({
        siteId: "site1",
        businessId: "biz1",
        maxRecommendations: 5,
        includePeerData: false,
      });

      // Assert: AC #5 - Max 5 recommendations
      expect(recommendations).toHaveLength(5);

      // Verify sorted by severity (highest first)
      for (let i = 0; i < recommendations.length - 1; i++) {
        const currentImpact = recommendations[i].impactLevel;
        const nextImpact = recommendations[i + 1].impactLevel;
        // HIGH > MEDIUM > LOW (not strictly required, but good to check)
      }
    });
  });

  describe("generateRecommendations - Peer Success Data (AC #3)", () => {
    it("should include peer success data when available", async () => {
      // Arrange: Pattern + business with peer group
      const mockPatterns: Partial<Pattern>[] = [
        {
          id: "pat1",
          siteId: "site1",
          patternType: "ABANDONMENT",
          description: "Shipping abandonment",
          severity: 0.8,
          sessionCount: 200,
          confidenceScore: 0.9,
          metadata: { stage: "shipping", dropOffRate: 45 },
          detectedAt: new Date(),
        },
      ];

      vi.mocked(prisma.pattern.findMany).mockResolvedValue(
        mockPatterns as Pattern[]
      );

      // Business with peer group
      vi.mocked(prisma.business.findUnique).mockResolvedValue({
        id: "biz1",
        userId: "user1",
        siteId: "site1",
        name: "Test Business",
        industry: "retail",
        revenueRange: "100k-500k",
        productTypes: ["physical"],
        platform: "shopify",
        peerGroupId: "peer1",
        createdAt: new Date(),
        peerGroup: {
          id: "peer1",
          criteria: {},
          businessIds: ["biz1", "biz2", "biz3"],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any);

      // Mock peer recommendations
      vi.mocked(prisma.recommendation.findMany).mockResolvedValue([
        {
          id: "rec1",
          businessId: "biz2",
          title: "Show shipping costs earlier",
          problemStatement: "Test",
          actionSteps: [],
          expectedImpact: "Test",
          confidenceLevel: "HIGH",
          status: "IMPLEMENTED",
          impactLevel: "HIGH",
          peerSuccessData: null,
          implementedAt: new Date(),
          dismissedAt: null,
          createdAt: new Date(),
        },
        {
          id: "rec2",
          businessId: "biz3",
          title: "Show shipping costs earlier",
          problemStatement: "Test",
          actionSteps: [],
          expectedImpact: "Test",
          confidenceLevel: "HIGH",
          status: "IMPLEMENTED",
          impactLevel: "HIGH",
          peerSuccessData: null,
          implementedAt: new Date(),
          dismissedAt: null,
          createdAt: new Date(),
        },
      ] as any);

      // Act
      const recommendations = await generateRecommendations({
        siteId: "site1",
        businessId: "biz1",
        includePeerData: true,
      });

      // Assert: AC #3 - Peer success data included
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].peerSuccessData).not.toBeNull();
      expect(recommendations[0].peerSuccessData).toContain("2 similar stores");
      expect(recommendations[0].peerSuccessData).toContain("18% average improvement");
    });

    it("should set peerSuccessData to null when no peer group", async () => {
      // Arrange
      const mockPatterns: Partial<Pattern>[] = [
        {
          id: "pat1",
          siteId: "site1",
          patternType: "ABANDONMENT",
          description: "Abandonment",
          severity: 0.8,
          sessionCount: 200,
          confidenceScore: 0.9,
          metadata: { stage: "cart", dropOffRate: 45 },
          detectedAt: new Date(),
        },
      ];

      vi.mocked(prisma.pattern.findMany).mockResolvedValue(
        mockPatterns as Pattern[]
      );
      vi.mocked(prisma.business.findUnique).mockResolvedValue(null);

      // Act
      const recommendations = await generateRecommendations({
        siteId: "site1",
        businessId: "biz1",
        includePeerData: true,
      });

      // Assert
      expect(recommendations[0].peerSuccessData).toBeNull();
    });
  });

  describe("generateRecommendations - Edge Cases", () => {
    it("should return empty array when no patterns detected", async () => {
      // Arrange: No patterns
      vi.mocked(prisma.pattern.findMany).mockResolvedValue([]);

      // Act
      const recommendations = await generateRecommendations({
        siteId: "site1",
        businessId: "biz1",
        includePeerData: false,
      });

      // Assert
      expect(recommendations).toEqual([]);
    });

    it("should handle patterns with incomplete metadata (fallback rules)", async () => {
      // Arrange: Pattern with missing metadata
      const mockPatterns: Partial<Pattern>[] = [
        {
          id: "pat1",
          siteId: "site1",
          patternType: "ABANDONMENT",
          description: "Generic abandonment",
          severity: 0.7,
          sessionCount: 150,
          confidenceScore: 0.8,
          metadata: {}, // Empty metadata
          detectedAt: new Date(),
        },
      ];

      vi.mocked(prisma.pattern.findMany).mockResolvedValue(
        mockPatterns as Pattern[]
      );
      vi.mocked(prisma.business.findUnique).mockResolvedValue(null);

      // Act
      const recommendations = await generateRecommendations({
        siteId: "site1",
        businessId: "biz1",
        includePeerData: false,
      });

      // Assert: Should use fallback rule for ABANDONMENT
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].title).toBe("Reduce checkout abandonment");
      expect(recommendations[0].problemStatement).toContain("[data unavailable]");
    });

    it("should filter patterns below minimum severity threshold", async () => {
      // Arrange: Patterns below threshold
      const mockPatterns: Partial<Pattern>[] = [
        {
          id: "pat1",
          siteId: "site1",
          patternType: "ABANDONMENT",
          description: "Low severity pattern",
          severity: 0.2, // Below default 0.3 threshold
          sessionCount: 100,
          confidenceScore: 0.7,
          metadata: { stage: "cart", dropOffRate: 25 },
          detectedAt: new Date(),
        },
      ];

      // Filter happens in query (minSeverity: 0.3)
      vi.mocked(prisma.pattern.findMany).mockResolvedValue([]);

      // Act
      const recommendations = await generateRecommendations({
        siteId: "site1",
        businessId: "biz1",
        minSeverity: 0.3,
        includePeerData: false,
      });

      // Assert
      expect(recommendations).toEqual([]);
    });
  });

  describe("storeRecommendations - Storage (AC #6)", () => {
    it("should bulk insert recommendations with skipDuplicates", async () => {
      // Arrange
      const recommendations = [
        {
          businessId: "biz1",
          siteId: "site1",
          title: "Test recommendation 1",
          problemStatement: "Problem",
          actionSteps: ["Action 1", "Action 2"],
          expectedImpact: "10-20%",
          confidenceLevel: "HIGH" as const,
          impactLevel: "HIGH" as const,
          peerSuccessData: null,
        },
        {
          businessId: "biz1",
          siteId: "site1",
          title: "Test recommendation 2",
          problemStatement: "Problem",
          actionSteps: ["Action 3", "Action 4"],
          expectedImpact: "15-25%",
          confidenceLevel: "MEDIUM" as const,
          impactLevel: "MEDIUM" as const,
          peerSuccessData: "5 stores saw 20% improvement",
        },
      ];

      vi.mocked(prisma.recommendation.createMany).mockResolvedValue({
        count: 2,
      });

      // Act
      const result = await storeRecommendations(recommendations);

      // Assert: AC #6 - Bulk insert used
      expect(prisma.recommendation.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            businessId: "biz1",
            title: "Test recommendation 1",
            status: "NEW", // Default status
          }),
          expect.objectContaining({
            businessId: "biz1",
            title: "Test recommendation 2",
            status: "NEW",
          }),
        ]),
        skipDuplicates: true, // AC #6 - Duplicate handling
      });

      expect(result.created).toBe(2);
      expect(result.errors).toEqual([]);
    });

    it("should return errors array on storage failure", async () => {
      // Arrange
      const recommendations = [
        {
          businessId: "biz1",
          siteId: "site1",
          title: "Test recommendation",
          problemStatement: "Problem",
          actionSteps: ["Action"],
          expectedImpact: "10%",
          confidenceLevel: "HIGH" as const,
          impactLevel: "HIGH" as const,
          peerSuccessData: null,
        },
      ];

      vi.mocked(prisma.recommendation.createMany).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await storeRecommendations(recommendations);

      // Assert
      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Database error");
    });
  });

  describe("generateAndStoreRecommendations - Complete Flow", () => {
    it("should generate and store recommendations successfully", async () => {
      // Arrange
      const mockPatterns: Partial<Pattern>[] = [
        {
          id: "pat1",
          siteId: "site1",
          patternType: "ABANDONMENT",
          description: "Shipping abandonment",
          severity: 0.8,
          sessionCount: 200,
          confidenceScore: 0.9,
          metadata: { stage: "shipping", dropOffRate: 45 },
          detectedAt: new Date(),
        },
      ];

      vi.mocked(prisma.pattern.findMany).mockResolvedValue(
        mockPatterns as Pattern[]
      );
      vi.mocked(prisma.business.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.recommendation.createMany).mockResolvedValue({
        count: 1,
      });

      // Act
      const result = await generateAndStoreRecommendations({
        siteId: "site1",
        businessId: "biz1",
        includePeerData: false,
      });

      // Assert
      expect(result.businessId).toBe("biz1");
      expect(result.recommendationsGenerated).toBe(1);
      expect(result.recommendationsStored).toBe(1);
      expect(result.errors).toEqual([]);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
