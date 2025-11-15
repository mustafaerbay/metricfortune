import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  markRecommendationImplemented,
  dismissRecommendation,
  planRecommendation,
} from "@/actions/recommendations";
import * as authLib from "@/lib/auth";
import { vi } from "vitest";

describe("Recommendation Detail - Server Actions", () => {
  let testBusinessId: string;
  let testUserId: string;
  let testRecommendationId: string;
  let otherBusinessId: string;
  let otherUserId: string;

  beforeEach(async () => {
    const timestamp = Date.now();
    
    // Create primary test user and business
    const user = await prisma.user.create({
      data: {
        email: `test-detail-${timestamp}@example.com`,
        passwordHash: "hashed_password",
        emailVerified: true,
      },
    });
    testUserId = user.id;

    const business = await prisma.business.create({
      data: {
        userId: user.id,
        name: "Test Business Detail",
        siteId: `test-site-detail-${timestamp}`,
        industry: "ECOMMERCE",
        platform: "SHOPIFY",
        revenueRange: "100K_500K",
        productTypes: ["PHYSICAL"],
      },
    });
    testBusinessId = business.id;

    // Create a second user/business for ownership tests
    const otherUser = await prisma.user.create({
      data: {
        email: `test-other-${timestamp}@example.com`,
        passwordHash: "hashed_password",
        emailVerified: true,
      },
    });
    otherUserId = otherUser.id;

    const otherBusiness = await prisma.business.create({
      data: {
        userId: otherUser.id,
        name: "Other Business",
        siteId: `test-site-other-${timestamp}`,
        industry: "ECOMMERCE",
        platform: "SHOPIFY",
        revenueRange: "100K_500K",
        productTypes: ["PHYSICAL"],
      },
    });
    otherBusinessId = otherBusiness.id;

    // Create test recommendation
    const recommendation = await prisma.recommendation.create({
      data: {
        businessId: testBusinessId,
        title: "Test Recommendation",
        problemStatement: "43% of users abandon at shipping form",
        actionSteps: [
          "Add guest checkout option",
          "Simplify shipping form fields",
          "Add progress indicator",
        ],
        expectedImpact: "15-20% reduction in abandonment",
        confidenceLevel: "MEDIUM",
        status: "NEW",
        impactLevel: "HIGH",
        peerSuccessData: "12 similar stores saw 18% average improvement",
      },
    });
    testRecommendationId = recommendation.id;

    // Mock auth to return test user session
    vi.spyOn(authLib, "auth").mockResolvedValue({
      user: {
        id: testUserId,
        email: `test-detail-${timestamp}@example.com`,
        businessId: testBusinessId,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    } as any);
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.recommendation.deleteMany({
      where: {
        OR: [{ businessId: testBusinessId }, { businessId: otherBusinessId }],
      },
    });
    await prisma.business.deleteMany({
      where: { id: { in: [testBusinessId, otherBusinessId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId, otherUserId] } },
    });

    // Restore auth mock
    vi.restoreAllMocks();
  });

  describe("AC#2, AC#7: Mark as Planned", () => {
    it("should successfully mark recommendation as planned", async () => {
      const result = await planRecommendation(testRecommendationId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("PLANNED");

      // Verify in database
      const updated = await prisma.recommendation.findUnique({
        where: { id: testRecommendationId },
      });
      expect(updated?.status).toBe("PLANNED");
    });

    it("should reject marking non-existent recommendation", async () => {
      const result = await planRecommendation("invalid-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("AC#2, AC#3, AC#4, AC#7: Mark as Implemented", () => {
    it("should successfully mark recommendation as implemented with date and notes", async () => {
      const implementDate = new Date("2025-11-10");
      const notes = "Installed Shopify checkout extension";

      const result = await markRecommendationImplemented(
        testRecommendationId,
        implementDate,
        notes
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("IMPLEMENTED");
      expect(result.data?.implementedAt).toEqual(implementDate);
      expect(result.data?.implementationNotes).toBe(notes);
    });

    it("should successfully mark as implemented without notes", async () => {
      const implementDate = new Date("2025-11-12");

      const result = await markRecommendationImplemented(
        testRecommendationId,
        implementDate
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("IMPLEMENTED");
      expect(result.data?.implementationNotes).toBeNull();
    });

    it("should reject notes longer than 500 characters", async () => {
      const longNotes = "a".repeat(501);

      const result = await markRecommendationImplemented(
        testRecommendationId,
        new Date(),
        longNotes
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("500 characters");
    });
  });

  describe("AC#2, AC#7: Dismiss Recommendation", () => {
    it("should successfully dismiss recommendation", async () => {
      const result = await dismissRecommendation(testRecommendationId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("DISMISSED");
      expect(result.data?.dismissedAt).toBeDefined();
    });
  });

  describe("AC#7: Status Changes Reflected", () => {
    it("should update status from NEW to PLANNED", async () => {
      const before = await prisma.recommendation.findUnique({
        where: { id: testRecommendationId },
      });
      expect(before?.status).toBe("NEW");

      await planRecommendation(testRecommendationId);

      const after = await prisma.recommendation.findUnique({
        where: { id: testRecommendationId },
      });
      expect(after?.status).toBe("PLANNED");
    });
  });

  describe("Security: Business Ownership Verification", () => {
    it("should reject unauthorized access to another business's recommendation", async () => {
      // Create a recommendation owned by the other business
      const otherRecommendation = await prisma.recommendation.create({
        data: {
          businessId: otherBusinessId,
          title: "Other Business Recommendation",
          problemStatement: "Different business problem",
          actionSteps: ["Step 1", "Step 2"],
          expectedImpact: "10-15% improvement",
          confidenceLevel: "MEDIUM",
          status: "NEW",
          impactLevel: "MEDIUM",
        },
      });

      // Try to mark another business's recommendation as planned (should fail)
      const planResult = await planRecommendation(otherRecommendation.id);
      expect(planResult.success).toBe(false);
      expect(planResult.error).toContain("not found");

      // Try to mark as implemented (should fail)
      const implementResult = await markRecommendationImplemented(
        otherRecommendation.id,
        new Date()
      );
      expect(implementResult.success).toBe(false);
      expect(implementResult.error).toContain("not found");

      // Try to dismiss (should fail)
      const dismissResult = await dismissRecommendation(otherRecommendation.id);
      expect(dismissResult.success).toBe(false);
      expect(dismissResult.error).toContain("not found");

      // Verify the other business's recommendation was not modified
      const unchanged = await prisma.recommendation.findUnique({
        where: { id: otherRecommendation.id },
      });
      expect(unchanged?.status).toBe("NEW");
    });
  });
});
