import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

describe("Dashboard Home - Integration Tests", () => {
  let testUserId: string;
  let testBusinessId: string;
  let testSiteId: string;

  beforeEach(async () => {
    // Create test user
    testUserId = `test-user-${nanoid()}`;
    const user = await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-${nanoid()}@example.com`,
        passwordHash: "hashed_password",
        emailVerified: true,
      },
    });

    // Create test business
    testSiteId = `site-${nanoid()}`;
    const business = await prisma.business.create({
      data: {
        userId: user.id,
        name: "Test Business",
        industry: "ECOMMERCE",
        revenueRange: "100K_500K",
        productTypes: ["PHYSICAL"],
        platform: "SHOPIFY",
        siteId: testSiteId,
      },
    });
    testBusinessId = business.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.recommendation.deleteMany({ where: { businessId: testBusinessId } });
    await prisma.session.deleteMany({ where: { siteId: testSiteId } });
    await prisma.trackingEvent.deleteMany({ where: { siteId: testSiteId } });
    await prisma.business.delete({ where: { id: testBusinessId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  describe("Metrics Calculation", () => {
    it("should calculate conversion rate correctly", async () => {
      // Create sessions with conversions
      await prisma.session.createMany({
        data: [
          {
            siteId: testSiteId,
            sessionId: `session-${nanoid()}`,
            entryPage: "/",
            pageCount: 5,
            bounced: false,
            converted: true,
            journeyPath: ["/", "/products", "/checkout"],
          },
          {
            siteId: testSiteId,
            sessionId: `session-${nanoid()}`,
            entryPage: "/",
            pageCount: 3,
            bounced: true,
            converted: false,
            journeyPath: ["/", "/products"],
          },
          {
            siteId: testSiteId,
            sessionId: `session-${nanoid()}`,
            entryPage: "/",
            pageCount: 4,
            bounced: false,
            converted: true,
            journeyPath: ["/", "/products", "/cart", "/checkout"],
          },
        ],
      });

      // Fetch sessions
      const sessions = await prisma.session.findMany({
        where: { siteId: testSiteId },
        select: { converted: true },
      });

      const totalSessions = sessions.length;
      const conversions = sessions.filter((s) => s.converted).length;
      const conversionRate = ((conversions / totalSessions) * 100).toFixed(1);

      expect(totalSessions).toBe(3);
      expect(conversions).toBe(2);
      expect(conversionRate).toBe("66.7");
    });

    it("should count active recommendations correctly", async () => {
      // Create recommendations with different statuses
      await prisma.recommendation.createMany({
        data: [
          {
            businessId: testBusinessId,
            title: "Recommendation 1",
            problemStatement: "Problem 1",
            actionSteps: ["Step 1"],
            expectedImpact: "High impact",
            confidenceLevel: "HIGH",
            status: "NEW",
            impactLevel: "HIGH",
          },
          {
            businessId: testBusinessId,
            title: "Recommendation 2",
            problemStatement: "Problem 2",
            actionSteps: ["Step 1"],
            expectedImpact: "Medium impact",
            confidenceLevel: "MEDIUM",
            status: "NEW",
            impactLevel: "MEDIUM",
          },
          {
            businessId: testBusinessId,
            title: "Recommendation 3",
            problemStatement: "Problem 3",
            actionSteps: ["Step 1"],
            expectedImpact: "Low impact",
            confidenceLevel: "LOW",
            status: "IMPLEMENTED",
            impactLevel: "LOW",
          },
        ],
      });

      const activeCount = await prisma.recommendation.count({
        where: {
          businessId: testBusinessId,
          status: "NEW",
        },
      });

      expect(activeCount).toBe(2);
    });

    it("should calculate cart abandonment rate correctly", async () => {
      // Create sessions with cart events
      const session1 = await prisma.session.create({
        data: {
          siteId: testSiteId,
          sessionId: `session-${nanoid()}`,
          entryPage: "/",
          pageCount: 5,
          bounced: false,
          converted: false,
          journeyPath: ["/", "/products", "/cart"],
        },
      });

      const session2 = await prisma.session.create({
        data: {
          siteId: testSiteId,
          sessionId: `session-${nanoid()}`,
          entryPage: "/",
          pageCount: 6,
          bounced: false,
          converted: true,
          journeyPath: ["/", "/products", "/cart", "/checkout"],
        },
      });

      // Create tracking events
      await prisma.trackingEvent.createMany({
        data: [
          {
            siteId: testSiteId,
            sessionId: session1.sessionId,
            eventType: "ADD_TO_CART",
            timestamp: new Date(),
            data: {},
          },
          {
            siteId: testSiteId,
            sessionId: session2.sessionId,
            eventType: "ADD_TO_CART",
            timestamp: new Date(),
            data: {},
          },
        ],
      });

      // Get cart sessions
      const addToCartEvents = await prisma.trackingEvent.findMany({
        where: {
          siteId: testSiteId,
          eventType: "ADD_TO_CART",
        },
        select: { sessionId: true },
        distinct: ["sessionId"],
      });

      const cartSessionIds = addToCartEvents.map((e) => e.sessionId);
      const cartSessions = cartSessionIds.length;

      const abandonedCarts = await prisma.session.count({
        where: {
          siteId: testSiteId,
          sessionId: { in: cartSessionIds },
          converted: false,
        },
      });

      const abandonmentRate = ((abandonedCarts / cartSessions) * 100).toFixed(1);

      expect(cartSessions).toBe(2);
      expect(abandonedCarts).toBe(1);
      expect(abandonmentRate).toBe("50.0");
    });
  });

  describe("Top Recommendation", () => {
    it("should fetch highest impact recommendation first", async () => {
      // Create recommendations with different impact levels
      await prisma.recommendation.createMany({
        data: [
          {
            businessId: testBusinessId,
            title: "Low Priority",
            problemStatement: "Problem 1",
            actionSteps: ["Step 1"],
            expectedImpact: "Low impact",
            confidenceLevel: "LOW",
            status: "NEW",
            impactLevel: "LOW",
          },
          {
            businessId: testBusinessId,
            title: "High Priority",
            problemStatement: "Problem 2",
            actionSteps: ["Step 1"],
            expectedImpact: "High impact",
            confidenceLevel: "HIGH",
            status: "NEW",
            impactLevel: "HIGH",
          },
          {
            businessId: testBusinessId,
            title: "Medium Priority",
            problemStatement: "Problem 3",
            actionSteps: ["Step 1"],
            expectedImpact: "Medium impact",
            confidenceLevel: "MEDIUM",
            status: "NEW",
            impactLevel: "MEDIUM",
          },
        ],
      });

      // Replicate the logic from getTopRecommendation
      const recommendations = await prisma.recommendation.findMany({
        where: {
          businessId: testBusinessId,
          status: "NEW",
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          impactLevel: true,
        },
      });

      // Sort by impact level (HIGH > MEDIUM > LOW)
      const impactOrder: Record<"HIGH" | "MEDIUM" | "LOW", number> = {
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
      };

      const sorted = recommendations.sort(
        (a, b) => (impactOrder[b.impactLevel] || 0) - (impactOrder[a.impactLevel] || 0)
      );

      const topRecommendation = sorted[0];

      expect(topRecommendation).not.toBeNull();
      expect(topRecommendation?.title).toBe("High Priority");
      expect(topRecommendation?.impactLevel).toBe("HIGH");
    });

    it("should return null when no NEW recommendations exist", async () => {
      // Create only IMPLEMENTED recommendations
      await prisma.recommendation.create({
        data: {
          businessId: testBusinessId,
          title: "Implemented Rec",
          problemStatement: "Problem",
          actionSteps: ["Step 1"],
          expectedImpact: "High impact",
          confidenceLevel: "HIGH",
          status: "IMPLEMENTED",
          impactLevel: "HIGH",
        },
      });

      const topRecommendation = await prisma.recommendation.findFirst({
        where: {
          businessId: testBusinessId,
          status: "NEW",
        },
        orderBy: [{ impactLevel: "desc" }],
      });

      expect(topRecommendation).toBeNull();
    });
  });

  describe("Empty State Detection", () => {
    it("should detect when no session data exists", async () => {
      const sessions = await prisma.session.findMany({
        where: { siteId: testSiteId },
      });

      expect(sessions.length).toBe(0);
    });

    it("should detect when session data exists", async () => {
      await prisma.session.create({
        data: {
          siteId: testSiteId,
          sessionId: `session-${nanoid()}`,
          entryPage: "/",
          pageCount: 1,
          bounced: true,
          converted: false,
          journeyPath: ["/"],
        },
      });

      const sessions = await prisma.session.findMany({
        where: { siteId: testSiteId },
      });

      expect(sessions.length).toBe(1);
    });
  });
});
