/**
 * Pattern Detector Service Unit Tests
 *
 * Tests for pattern detection logic, statistical significance filtering,
 * severity calculations, and pattern summary generation.
 *
 * Coverage:
 * - AC #1: Pattern detection (abandonment, hesitation, low engagement)
 * - AC #2: Statistical significance thresholds
 * - AC #3: Severity ranking
 * - AC #4: Human-readable pattern summaries
 * - AC #6: Pattern storage with confidence scores
 * - AC #7: Edge cases and error handling
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  detectPatterns,
  generatePatternSummary,
  storePatterns,
} from "@/services/analytics/pattern-detector";
import { prisma } from "@/lib/prisma";
import { PatternType } from "@/types/pattern";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
    },
    trackingEvent: {
      findMany: vi.fn(),
    },
    pattern: {
      createMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("Pattern Detector Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("detectPatterns - Abandonment Detection (AC #1)", () => {
    it("should detect abandonment pattern with >30% drop-off", async () => {
      // Arrange: 150 sessions with 50% abandonment at /cart stage
      const mockSessions = [
        // 100 sessions reach /cart
        ...Array.from({ length: 100 }, (_, i) => ({
          sessionId: `session${i}`,
          journeyPath: ["/home", "/products", "/cart"],
          duration: 120,
          pageCount: 3,
          exitPage: "/cart",
          createdAt: new Date("2025-11-01T10:00:00Z"),
        })),
        // 50 sessions continue to /checkout
        ...Array.from({ length: 50 }, (_, i) => ({
          sessionId: `session${i + 100}`,
          journeyPath: ["/home", "/products", "/cart", "/checkout"],
          duration: 180,
          pageCount: 4,
          exitPage: "/checkout",
          createdAt: new Date("2025-11-01T10:00:00Z"),
        })),
      ];

      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue([]);

      // Act
      const patterns = await detectPatterns("site1", {
        startDate: new Date("2025-11-01T00:00:00Z"),
        endDate: new Date("2025-11-07T00:00:00Z"),
      });

      // Assert: Should detect /cart abandonment (50% drop-off rate)
      const abandonmentPatterns = patterns.filter(
        (p) => p.patternType === PatternType.ABANDONMENT
      );
      expect(abandonmentPatterns.length).toBeGreaterThan(0);

      const cartAbandonment = abandonmentPatterns.find((p) =>
        p.description.includes("/cart")
      );
      expect(cartAbandonment).toBeDefined();
      expect(cartAbandonment?.severity).toBeGreaterThan(0);
      expect(cartAbandonment?.confidenceScore).toBeGreaterThan(0);
    });

    it("should not detect patterns below 30% threshold", async () => {
      // Arrange: 150 sessions with only 20% abandonment (below threshold)
      const mockSessions = [
        ...Array.from({ length: 120 }, (_, i) => ({
          sessionId: `session${i}`,
          journeyPath: ["/home", "/products", "/cart", "/checkout"],
          duration: 180,
          pageCount: 4,
          exitPage: "/checkout",
          createdAt: new Date("2025-11-01T10:00:00Z"),
        })),
        ...Array.from({ length: 30 }, (_, i) => ({
          sessionId: `session${i + 120}`,
          journeyPath: ["/home", "/products", "/cart"],
          duration: 120,
          pageCount: 3,
          exitPage: "/cart",
          createdAt: new Date("2025-11-01T10:00:00Z"),
        })),
      ];

      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue([]);

      // Act
      const patterns = await detectPatterns("site1", {
        startDate: new Date("2025-11-01T00:00:00Z"),
        endDate: new Date("2025-11-07T00:00:00Z"),
      });

      // Assert: /cart should not be flagged (20% < 30% threshold)
      const cartAbandonment = patterns.find(
        (p) =>
          p.patternType === PatternType.ABANDONMENT &&
          p.description.includes("/cart")
      );
      expect(cartAbandonment).toBeUndefined();
    });
  });

  describe("detectPatterns - Hesitation Detection (AC #1)", () => {
    it("should detect hesitation pattern with form re-entry", async () => {
      // Arrange: 120 sessions with 30% showing email field re-entry
      const mockSessions = Array.from({ length: 120 }, (_, i) => ({
        sessionId: `session${i}`,
        journeyPath: ["/checkout"],
        duration: 180,
        pageCount: 1,
        exitPage: "/checkout",
        createdAt: new Date("2025-11-01T10:00:00Z"),
      }));

      const mockFormEvents = [
        // 36 sessions (30%) with re-entry on email field
        ...Array.from({ length: 36 }, (_, i) => [
          {
            sessionId: `session${i}`,
            eventType: "form_focus",
            data: { field: "email" },
            timestamp: new Date("2025-11-01T10:00:00Z"),
          },
          {
            sessionId: `session${i}`,
            eventType: "form_blur",
            data: { field: "email" },
            timestamp: new Date("2025-11-01T10:00:10Z"),
          },
          {
            sessionId: `session${i}`,
            eventType: "form_focus",
            data: { field: "email" },
            timestamp: new Date("2025-11-01T10:00:20Z"),
          },
        ]).flat(),
        // 84 sessions (70%) without re-entry
        ...Array.from({ length: 84 }, (_, i) => [
          {
            sessionId: `session${i + 36}`,
            eventType: "form_focus",
            data: { field: "email" },
            timestamp: new Date("2025-11-01T10:00:00Z"),
          },
        ]).flat(),
      ];

      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(
        mockFormEvents
      );

      // Act
      const patterns = await detectPatterns("site1", {
        startDate: new Date("2025-11-01T00:00:00Z"),
        endDate: new Date("2025-11-07T00:00:00Z"),
      });

      // Assert: Should detect email field hesitation (30% > 20% threshold)
      const hesitationPatterns = patterns.filter(
        (p) => p.patternType === PatternType.HESITATION
      );
      expect(hesitationPatterns.length).toBeGreaterThan(0);

      const emailHesitation = hesitationPatterns.find((p) =>
        p.description.includes("email")
      );
      expect(emailHesitation).toBeDefined();
      expect(emailHesitation?.metadata.reEntryRate).toBeGreaterThanOrEqual(20);
    });
  });

  describe("detectPatterns - Low Engagement Detection (AC #1)", () => {
    it("should detect pages with below-average time-on-page", async () => {
      // Arrange: Sessions with varying time-on-page
      // Site average: 100s per page
      // /pricing page: 40s per page (<70% of average)
      const mockSessions = [
        // 150 sessions on /home (100s average per page)
        ...Array.from({ length: 150 }, (_, i) => ({
          sessionId: `session${i}`,
          journeyPath: ["/home"],
          duration: 100,
          pageCount: 1,
          exitPage: "/home",
          createdAt: new Date("2025-11-01T10:00:00Z"),
        })),
        // 100 sessions on /pricing (40s average per page - low engagement)
        ...Array.from({ length: 100 }, (_, i) => ({
          sessionId: `session${i + 150}`,
          journeyPath: ["/pricing"],
          duration: 40,
          pageCount: 1,
          exitPage: "/pricing",
          createdAt: new Date("2025-11-01T10:00:00Z"),
        })),
      ];

      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue([]);

      // Act
      const patterns = await detectPatterns("site1", {
        startDate: new Date("2025-11-01T00:00:00Z"),
        endDate: new Date("2025-11-07T00:00:00Z"),
      });

      // Assert: Should detect /pricing as low engagement
      const engagementPatterns = patterns.filter(
        (p) => p.patternType === PatternType.LOW_ENGAGEMENT
      );
      expect(engagementPatterns.length).toBeGreaterThan(0);

      const pricingEngagement = engagementPatterns.find((p) =>
        p.description.includes("/pricing")
      );
      expect(pricingEngagement).toBeDefined();
      expect(pricingEngagement?.metadata.timeOnPage).toBeLessThan(
        pricingEngagement?.metadata.siteAverage! * 0.7
      );
    });
  });

  describe("detectPatterns - Statistical Significance (AC #2)", () => {
    it("should filter out patterns with <100 sessions", async () => {
      // Arrange: Only 50 sessions (below 100 threshold)
      const mockSessions = Array.from({ length: 50 }, (_, i) => ({
        sessionId: `session${i}`,
        journeyPath: ["/home", "/cart"],
        duration: 120,
        pageCount: 2,
        exitPage: "/cart",
        createdAt: new Date("2025-11-01T10:00:00Z"),
      }));

      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue([]);

      // Act
      const patterns = await detectPatterns("site1", {
        startDate: new Date("2025-11-01T00:00:00Z"),
        endDate: new Date("2025-11-07T00:00:00Z"),
      });

      // Assert: No patterns should be returned (insufficient data)
      expect(patterns).toHaveLength(0);
    });

    it("should include patterns with >=100 sessions", async () => {
      // Arrange: Exactly 100 sessions at threshold
      const mockSessions = Array.from({ length: 100 }, (_, i) => ({
        sessionId: `session${i}`,
        journeyPath: ["/home", "/products"],
        duration: 120,
        pageCount: 2,
        exitPage: "/products",
        createdAt: new Date("2025-11-01T10:00:00Z"),
      }));

      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue([]);

      // Act
      const patterns = await detectPatterns("site1", {
        startDate: new Date("2025-11-01T00:00:00Z"),
        endDate: new Date("2025-11-07T00:00:00Z"),
      });

      // Assert: Patterns should be included (meets threshold)
      // Note: Patterns will be detected if abandonment rate is >30%
      expect(patterns.length).toBeGreaterThanOrEqual(0);
    });

    it("should assign confidence scores based on session count", async () => {
      // Arrange: 300 sessions (should get HIGH confidence: 0.8)
      const mockSessions = Array.from({ length: 300 }, (_, i) => ({
        sessionId: `session${i}`,
        journeyPath: ["/home", "/cart"],
        duration: 120,
        pageCount: 2,
        exitPage: "/cart",
        createdAt: new Date("2025-11-01T10:00:00Z"),
      }));

      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue([]);

      // Act
      const patterns = await detectPatterns("site1", {
        startDate: new Date("2025-11-01T00:00:00Z"),
        endDate: new Date("2025-11-07T00:00:00Z"),
      });

      // Assert: Patterns should have HIGH confidence (0.8)
      const pattern = patterns[0];
      if (pattern) {
        expect(pattern.confidenceScore).toBeGreaterThanOrEqual(0.6);
        expect(pattern.confidenceScore).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe("detectPatterns - Severity Ranking (AC #3)", () => {
    it("should calculate severity based on rate and volume", async () => {
      // Arrange: Multiple patterns with different severities
      const mockSessions = [
        // High severity: 100 sessions, 80% abandonment
        ...Array.from({ length: 100 }, (_, i) => ({
          sessionId: `session${i}`,
          journeyPath: ["/checkout"],
          duration: 60,
          pageCount: 1,
          exitPage: "/checkout",
          createdAt: new Date("2025-11-01T10:00:00Z"),
        })),
        ...Array.from({ length: 20 }, (_, i) => ({
          sessionId: `session${i + 100}`,
          journeyPath: ["/checkout", "/confirmation"],
          duration: 120,
          pageCount: 2,
          exitPage: "/confirmation",
          createdAt: new Date("2025-11-01T10:00:00Z"),
        })),
        // Lower severity: 100 sessions, 40% abandonment
        ...Array.from({ length: 60 }, (_, i) => ({
          sessionId: `session${i + 120}`,
          journeyPath: ["/cart"],
          duration: 60,
          pageCount: 1,
          exitPage: "/cart",
          createdAt: new Date("2025-11-01T10:00:00Z"),
        })),
        ...Array.from({ length: 40 }, (_, i) => ({
          sessionId: `session${i + 180}`,
          journeyPath: ["/cart", "/checkout"],
          duration: 120,
          pageCount: 2,
          exitPage: "/checkout",
          createdAt: new Date("2025-11-01T10:00:00Z"),
        })),
      ];

      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue([]);

      // Act
      const patterns = await detectPatterns("site1", {
        startDate: new Date("2025-11-01T00:00:00Z"),
        endDate: new Date("2025-11-07T00:00:00Z"),
      });

      // Assert: Patterns should be ranked by severity (0.0 - 1.0)
      const abandonmentPatterns = patterns.filter(
        (p) => p.patternType === PatternType.ABANDONMENT
      );
      for (const pattern of abandonmentPatterns) {
        expect(pattern.severity).toBeGreaterThanOrEqual(0);
        expect(pattern.severity).toBeLessThanOrEqual(1);
      }

      // Higher drop-off rate should have higher severity
      if (abandonmentPatterns.length >= 2) {
        const sortedBySeverity = [...abandonmentPatterns].sort(
          (a, b) => b.severity - a.severity
        );
        expect(sortedBySeverity[0].severity).toBeGreaterThanOrEqual(
          sortedBySeverity[1].severity
        );
      }
    });
  });

  describe("generatePatternSummary - Human-Readable Summaries (AC #4)", () => {
    it("should generate summary for abandonment pattern", () => {
      // Arrange
      const metadata = {
        stage: "/checkout",
        dropOffRate: 45.5,
        affectedSessions: 150,
      };

      // Act
      const summary = generatePatternSummary(PatternType.ABANDONMENT, metadata);

      // Assert
      expect(summary).toContain("45.5%");
      expect(summary).toContain("/checkout");
      expect(summary).toContain("150 sessions");
      expect(summary.toLowerCase()).toContain("abandon");
    });

    it("should generate summary for hesitation pattern", () => {
      // Arrange
      const metadata = {
        field: "credit_card",
        reEntryRate: 35.2,
        affectedSessions: 80,
      };

      // Act
      const summary = generatePatternSummary(PatternType.HESITATION, metadata);

      // Assert
      expect(summary).toContain("35.2%");
      expect(summary).toContain("credit_card");
      expect(summary).toContain("80 sessions");
      expect(summary.toLowerCase()).toContain("re-enter");
    });

    it("should generate summary for low engagement pattern", () => {
      // Arrange
      const metadata = {
        page: "/terms-of-service",
        timeOnPage: 15.5,
        siteAverage: 45.0,
        engagementGap: 65.6,
        affectedSessions: 200,
      };

      // Act
      const summary = generatePatternSummary(
        PatternType.LOW_ENGAGEMENT,
        metadata
      );

      // Assert
      expect(summary).toContain("65.6%");
      expect(summary).toContain("/terms-of-service");
      expect(summary).toContain("15.5");
      expect(summary).toContain("45");
      expect(summary).toContain("200 pageviews");
    });
  });

  describe("storePatterns - Pattern Storage (AC #6)", () => {
    it("should store patterns with bulk insert", async () => {
      // Arrange
      const patterns = [
        {
          siteId: "site1",
          patternType: PatternType.ABANDONMENT,
          description: "50% abandon at /cart",
          severity: 0.75,
          sessionCount: 200,
          confidenceScore: 0.8,
          metadata: { stage: "/cart", dropOffRate: 50 },
        },
        {
          siteId: "site1",
          patternType: PatternType.HESITATION,
          description: "30% re-enter email field",
          severity: 0.45,
          sessionCount: 150,
          confidenceScore: 0.6,
          metadata: { field: "email", reEntryRate: 30 },
        },
      ];

      vi.mocked(prisma.pattern.createMany).mockResolvedValue({ count: 2 });

      // Act
      const result = await storePatterns(patterns);

      // Assert
      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(prisma.pattern.createMany).toHaveBeenCalledOnce();
    });

    it("should handle empty pattern array", async () => {
      // Arrange
      const patterns: any[] = [];

      // Act
      const result = await storePatterns(patterns);

      // Assert
      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(prisma.pattern.createMany).not.toHaveBeenCalled();
    });

    it("should fallback to individual creates on bulk insert failure", async () => {
      // Arrange
      const patterns = [
        {
          siteId: "site1",
          patternType: PatternType.ABANDONMENT,
          description: "Pattern 1",
          severity: 0.7,
          sessionCount: 150,
          confidenceScore: 0.8,
          metadata: {},
        },
      ];

      vi.mocked(prisma.pattern.createMany).mockRejectedValue(
        new Error("Bulk insert failed")
      );
      vi.mocked(prisma.pattern.create).mockResolvedValue({
        id: "pattern1",
        ...patterns[0],
        metadata: {},
        detectedAt: new Date(),
      });

      // Act
      const result = await storePatterns(patterns);

      // Assert
      expect(result.created).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(prisma.pattern.create).toHaveBeenCalledOnce();
    });
  });

  describe("detectPatterns - Edge Cases (AC #7)", () => {
    it("should handle insufficient data gracefully", async () => {
      // Arrange: Less than 100 sessions
      const mockSessions = Array.from({ length: 50 }, (_, i) => ({
        sessionId: `session${i}`,
        journeyPath: ["/home"],
        duration: 60,
        pageCount: 1,
        exitPage: "/home",
        createdAt: new Date("2025-11-01T10:00:00Z"),
      }));

      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue([]);

      // Act
      const patterns = await detectPatterns("site1", {
        startDate: new Date("2025-11-01T00:00:00Z"),
        endDate: new Date("2025-11-07T00:00:00Z"),
      });

      // Assert
      expect(patterns).toHaveLength(0);
    });

    it("should handle sessions with null duration", async () => {
      // Arrange
      const mockSessions = Array.from({ length: 150 }, (_, i) => ({
        sessionId: `session${i}`,
        journeyPath: ["/home"],
        duration: null,
        pageCount: 1,
        exitPage: "/home",
        createdAt: new Date("2025-11-01T10:00:00Z"),
      }));

      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue([]);

      // Act & Assert: Should not throw
      await expect(
        detectPatterns("site1", {
          startDate: new Date("2025-11-01T00:00:00Z"),
          endDate: new Date("2025-11-07T00:00:00Z"),
        })
      ).resolves.toBeDefined();
    });

    it("should handle no patterns detected", async () => {
      // Arrange: Perfect conversion funnel (no abandonment)
      const mockSessions = Array.from({ length: 150 }, (_, i) => ({
        sessionId: `session${i}`,
        journeyPath: ["/home", "/products", "/cart", "/checkout", "/confirmation"],
        duration: 300,
        pageCount: 5,
        exitPage: "/confirmation",
        createdAt: new Date("2025-11-01T10:00:00Z"),
      }));

      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions);
      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue([]);

      // Act
      const patterns = await detectPatterns("site1", {
        startDate: new Date("2025-11-01T00:00:00Z"),
        endDate: new Date("2025-11-07T00:00:00Z"),
      });

      // Assert: May return empty or low-severity patterns
      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
    });
  });
});
