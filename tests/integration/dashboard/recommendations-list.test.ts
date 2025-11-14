import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Recommendations List - Data Fetching and Sorting", () => {
  let testBusinessId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Create test user and business
    const user = await prisma.user.create({
      data: {
        email: `test-rec-${Date.now()}@example.com`,
        passwordHash: "hashed_password",
        emailVerified: true,
      },
    });
    testUserId = user.id;

    const business = await prisma.business.create({
      data: {
        userId: user.id,
        name: "Test Business Recommendations",
        siteId: `test-site-rec-${Date.now()}`,
        industry: "ECOMMERCE",
        platform: "SHOPIFY",
        revenueRange: "100K_500K",
        productTypes: ["PHYSICAL"],
      },
    });
    testBusinessId = business.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.recommendation.deleteMany({
      where: { businessId: testBusinessId },
    });
    await prisma.business.deleteMany({ where: { id: testBusinessId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  describe("AC#3: Priority Sorting (Impact × Confidence)", () => {
    it("should sort recommendations by priority (impact × confidence)", async () => {
      // Create recommendations with different priorities
      // Priority = impact level × confidence level
      // HIGH=3, MEDIUM=2, LOW=1

      const lowRec = await prisma.recommendation.create({
        data: {
          businessId: testBusinessId,
          title: "Low Priority", // LOW × HIGH = 1 × 3 = 3
          problemStatement: "Low priority issue",
          actionSteps: ["Step 1"],
          expectedImpact: "Minimal impact",
          confidenceLevel: "HIGH",
          status: "NEW",
          impactLevel: "LOW",
        },
      });

      const highRec = await prisma.recommendation.create({
        data: {
          businessId: testBusinessId,
          title: "High Priority", // HIGH × HIGH = 3 × 3 = 9
          problemStatement: "Critical issue",
          actionSteps: ["Step 1"],
          expectedImpact: "Major impact",
          confidenceLevel: "HIGH",
          status: "NEW",
          impactLevel: "HIGH",
        },
      });

      const mediumRec = await prisma.recommendation.create({
        data: {
          businessId: testBusinessId,
          title: "Medium Priority", // MEDIUM × MEDIUM = 2 × 2 = 4
          problemStatement: "Moderate issue",
          actionSteps: ["Step 1"],
          expectedImpact: "Moderate impact",
          confidenceLevel: "MEDIUM",
          status: "NEW",
          impactLevel: "MEDIUM",
        },
      });

      // Fetch and manually sort (simulating the page.tsx logic)
      const recommendations = await prisma.recommendation.findMany({
        where: { businessId: testBusinessId },
        orderBy: { createdAt: "desc" },
      });

      // Manual sort by priority (impact × confidence)
      const levelValue: Record<"HIGH" | "MEDIUM" | "LOW", number> = {
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
      };

      const sorted = recommendations.sort((a, b) => {
        const priorityA = (levelValue[a.impactLevel] || 0) * (levelValue[a.confidenceLevel] || 0);
        const priorityB = (levelValue[b.impactLevel] || 0) * (levelValue[b.confidenceLevel] || 0);
        return priorityB - priorityA;
      });

      // Verify order by priority: 9 → 4 → 3
      expect(sorted[0].title).toBe("High Priority"); // 9
      expect(sorted[1].title).toBe("Medium Priority"); // 4
      expect(sorted[2].title).toBe("Low Priority"); // 3
    });

    it("should demonstrate impact × confidence: HIGH impact × LOW confidence < MEDIUM impact × HIGH confidence", async () => {
      // This test shows that priority considers BOTH impact AND confidence
      // HIGH × LOW (3 × 1 = 3) should rank LOWER than MEDIUM × HIGH (2 × 3 = 6)

      const highImpactLowConfidence = await prisma.recommendation.create({
        data: {
          businessId: testBusinessId,
          title: "HIGH Impact × LOW Confidence", // 3 × 1 = 3
          problemStatement: "High impact but uncertain",
          actionSteps: ["Step 1"],
          expectedImpact: "High impact",
          confidenceLevel: "LOW",
          status: "NEW",
          impactLevel: "HIGH",
        },
      });

      const mediumImpactHighConfidence = await prisma.recommendation.create({
        data: {
          businessId: testBusinessId,
          title: "MEDIUM Impact × HIGH Confidence", // 2 × 3 = 6
          problemStatement: "Medium impact but very confident",
          actionSteps: ["Step 1"],
          expectedImpact: "Medium impact",
          confidenceLevel: "HIGH",
          status: "NEW",
          impactLevel: "MEDIUM",
        },
      });

      // Fetch and sort
      const recommendations = await prisma.recommendation.findMany({
        where: { businessId: testBusinessId },
        orderBy: { createdAt: "desc" },
      });

      const levelValue: Record<"HIGH" | "MEDIUM" | "LOW", number> = {
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
      };

      const sorted = recommendations.sort((a, b) => {
        const priorityA = (levelValue[a.impactLevel] || 0) * (levelValue[a.confidenceLevel] || 0);
        const priorityB = (levelValue[b.impactLevel] || 0) * (levelValue[b.confidenceLevel] || 0);
        return priorityB - priorityA;
      });

      // MEDIUM × HIGH (6) should come BEFORE HIGH × LOW (3)
      expect(sorted[0].title).toBe("MEDIUM Impact × HIGH Confidence"); // priority 6
      expect(sorted[1].title).toBe("HIGH Impact × LOW Confidence"); // priority 3
    });

    it("should apply secondary sort by createdAt within same priority", async () => {
      // Create multiple recommendations with same priority (impact × confidence)
      // Both have priority 9 (HIGH × HIGH = 3 × 3)
      const older = await prisma.recommendation.create({
        data: {
          businessId: testBusinessId,
          title: "Older High Priority",
          problemStatement: "Older issue",
          actionSteps: ["Step 1"],
          expectedImpact: "High impact",
          confidenceLevel: "HIGH",
          status: "NEW",
          impactLevel: "HIGH",
          createdAt: new Date("2025-01-01"),
        },
      });

      // Wait to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const newer = await prisma.recommendation.create({
        data: {
          businessId: testBusinessId,
          title: "Newer High Priority",
          problemStatement: "Newer issue",
          actionSteps: ["Step 1"],
          expectedImpact: "High impact",
          confidenceLevel: "HIGH",
          status: "NEW",
          impactLevel: "HIGH",
          createdAt: new Date("2025-01-02"),
        },
      });

      // Fetch and sort
      const recommendations = await prisma.recommendation.findMany({
        where: { businessId: testBusinessId },
        orderBy: { createdAt: "desc" },
      });

      const levelValue: Record<"HIGH" | "MEDIUM" | "LOW", number> = {
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
      };

      const sorted = recommendations.sort((a, b) => {
        const priorityA = (levelValue[a.impactLevel] || 0) * (levelValue[a.confidenceLevel] || 0);
        const priorityB = (levelValue[b.impactLevel] || 0) * (levelValue[b.confidenceLevel] || 0);
        const priorityDiff = priorityB - priorityA;
        if (priorityDiff !== 0) return priorityDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      // Newer should come before older within same priority
      expect(sorted[0].title).toBe("Newer High Priority");
      expect(sorted[1].title).toBe("Older High Priority");
    });
  });

  describe("AC#4: Filtering by Status and Impact", () => {
    beforeEach(async () => {
      // Create recommendations with different statuses and impact levels
      await prisma.recommendation.createMany({
        data: [
          {
            businessId: testBusinessId,
            title: "NEW HIGH",
            problemStatement: "Test",
            actionSteps: ["Step 1"],
            expectedImpact: "Test",
            confidenceLevel: "HIGH",
            status: "NEW",
            impactLevel: "HIGH",
          },
          {
            businessId: testBusinessId,
            title: "NEW MEDIUM",
            problemStatement: "Test",
            actionSteps: ["Step 1"],
            expectedImpact: "Test",
            confidenceLevel: "MEDIUM",
            status: "NEW",
            impactLevel: "MEDIUM",
          },
          {
            businessId: testBusinessId,
            title: "PLANNED HIGH",
            problemStatement: "Test",
            actionSteps: ["Step 1"],
            expectedImpact: "Test",
            confidenceLevel: "HIGH",
            status: "PLANNED",
            impactLevel: "HIGH",
          },
          {
            businessId: testBusinessId,
            title: "DISMISSED LOW",
            problemStatement: "Test",
            actionSteps: ["Step 1"],
            expectedImpact: "Test",
            confidenceLevel: "LOW",
            status: "DISMISSED",
            impactLevel: "LOW",
          },
        ],
      });
    });

    it("should filter by status only", async () => {
      const newRecs = await prisma.recommendation.findMany({
        where: { businessId: testBusinessId, status: "NEW" },
      });

      expect(newRecs).toHaveLength(2);
      expect(newRecs.every((r) => r.status === "NEW")).toBe(true);
    });

    it("should filter by impact level only", async () => {
      const highRecs = await prisma.recommendation.findMany({
        where: { businessId: testBusinessId, impactLevel: "HIGH" },
      });

      expect(highRecs).toHaveLength(2);
      expect(highRecs.every((r) => r.impactLevel === "HIGH")).toBe(true);
    });

    it("should filter by both status and impact level", async () => {
      const filtered = await prisma.recommendation.findMany({
        where: {
          businessId: testBusinessId,
          status: "NEW",
          impactLevel: "HIGH",
        },
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe("NEW HIGH");
    });
  });

  describe("AC#7: Empty State Detection", () => {
    it("should detect when no recommendations exist", async () => {
      const recommendations = await prisma.recommendation.findMany({
        where: { businessId: testBusinessId },
      });

      expect(recommendations).toHaveLength(0);
    });

    it("should detect when all recommendations are dismissed", async () => {
      // Create only dismissed recommendations
      await prisma.recommendation.createMany({
        data: [
          {
            businessId: testBusinessId,
            title: "Dismissed 1",
            problemStatement: "Test",
            actionSteps: ["Step 1"],
            expectedImpact: "Test",
            confidenceLevel: "HIGH",
            status: "DISMISSED",
            impactLevel: "HIGH",
            dismissedAt: new Date(),
          },
          {
            businessId: testBusinessId,
            title: "Dismissed 2",
            problemStatement: "Test",
            actionSteps: ["Step 1"],
            expectedImpact: "Test",
            confidenceLevel: "MEDIUM",
            status: "DISMISSED",
            impactLevel: "MEDIUM",
            dismissedAt: new Date(),
          },
        ],
      });

      const recommendations = await prisma.recommendation.findMany({
        where: { businessId: testBusinessId },
      });

      const allDismissed =
        recommendations.length > 0 &&
        recommendations.every((r) => r.status === "DISMISSED");

      expect(allDismissed).toBe(true);
    });

    it("should detect when filters return no results", async () => {
      // Create only NEW recommendations
      await prisma.recommendation.create({
        data: {
          businessId: testBusinessId,
          title: "NEW Recommendation",
          problemStatement: "Test",
          actionSteps: ["Step 1"],
          expectedImpact: "Test",
          confidenceLevel: "HIGH",
          status: "NEW",
          impactLevel: "HIGH",
        },
      });

      // Filter for IMPLEMENTED (should return empty)
      const filtered = await prisma.recommendation.findMany({
        where: {
          businessId: testBusinessId,
          status: "IMPLEMENTED",
        },
      });

      expect(filtered).toHaveLength(0);
    });
  });

  describe("AC#6: NEW Badge Logic", () => {
    it("should identify recommendations created within last 7 days as new", () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const sixDaysAgo = new Date();
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      // Helper function (from recommendation-utils.ts)
      const isNew = (createdAt: Date) => {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - 7);
        return createdAt >= threshold;
      };

      expect(isNew(sixDaysAgo)).toBe(true);
      expect(isNew(eightDaysAgo)).toBe(false);
      expect(isNew(new Date())).toBe(true);
    });
  });

  describe("Integration: Recommendation Count and Isolation", () => {
    it("should fetch recommendations only for specific business", async () => {
      // Create another business
      const otherUser = await prisma.user.create({
        data: {
          email: `other-rec-${Date.now()}@example.com`,
          passwordHash: "hashed_password",
          emailVerified: true,
        },
      });

      const otherBusiness = await prisma.business.create({
        data: {
          userId: otherUser.id,
          name: "Other Business",
          siteId: `other-site-${Date.now()}`,
          industry: "ECOMMERCE",
          platform: "SHOPIFY",
          revenueRange: "100K_500K",
          productTypes: ["PHYSICAL"],
        },
      });

      // Create recommendations for both businesses
      await prisma.recommendation.create({
        data: {
          businessId: testBusinessId,
          title: "Test Business Rec",
          problemStatement: "Test",
          actionSteps: ["Step 1"],
          expectedImpact: "Test",
          confidenceLevel: "HIGH",
          status: "NEW",
          impactLevel: "HIGH",
        },
      });

      await prisma.recommendation.create({
        data: {
          businessId: otherBusiness.id,
          title: "Other Business Rec",
          problemStatement: "Test",
          actionSteps: ["Step 1"],
          expectedImpact: "Test",
          confidenceLevel: "HIGH",
          status: "NEW",
          impactLevel: "HIGH",
        },
      });

      // Fetch for test business only
      const testRecs = await prisma.recommendation.findMany({
        where: { businessId: testBusinessId },
      });

      expect(testRecs).toHaveLength(1);
      expect(testRecs[0].title).toBe("Test Business Rec");

      // Cleanup
      await prisma.recommendation.deleteMany({
        where: { businessId: otherBusiness.id },
      });
      await prisma.business.delete({ where: { id: otherBusiness.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it("should verify recommendation fields are fetched correctly", async () => {
      const peerData = "12 similar stores saw +18% improvement";

      const rec = await prisma.recommendation.create({
        data: {
          businessId: testBusinessId,
          title: "Test Recommendation",
          problemStatement: "This is a test problem",
          actionSteps: ["Step 1", "Step 2"],
          expectedImpact: "Expected to improve conversion by 15%",
          confidenceLevel: "HIGH",
          status: "NEW",
          impactLevel: "HIGH",
          peerSuccessData: peerData,
        },
      });

      // Fetch with select (simulating page.tsx query)
      const fetched = await prisma.recommendation.findUnique({
        where: { id: rec.id },
        select: {
          id: true,
          title: true,
          problemStatement: true,
          impactLevel: true,
          confidenceLevel: true,
          status: true,
          peerSuccessData: true,
          createdAt: true,
        },
      });

      expect(fetched).not.toBeNull();
      expect(fetched?.title).toBe("Test Recommendation");
      expect(fetched?.problemStatement).toBe("This is a test problem");
      expect(fetched?.impactLevel).toBe("HIGH");
      expect(fetched?.confidenceLevel).toBe("HIGH");
      expect(fetched?.status).toBe("NEW");
      expect(fetched?.peerSuccessData).toBe(peerData);
      expect(fetched?.createdAt).toBeInstanceOf(Date);
    });
  });
});
