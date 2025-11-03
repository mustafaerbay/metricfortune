/**
 * Session Aggregator Service Unit Tests
 *
 * Tests for session aggregation logic, journey extraction,
 * metadata calculation, and funnel analysis.
 *
 * Coverage:
 * - AC #1: Session grouping by sessionId
 * - AC #2: Journey sequence extraction
 * - AC #3: Session metadata calculations
 * - AC #6: Journey funnel calculations
 * - AC #7: Performance targets
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  aggregateSessions,
  createSessions,
  calculateJourneyFunnels,
} from "@/services/analytics/session-aggregator";
import { prisma } from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    trackingEvent: {
      findMany: vi.fn(),
    },
    session: {
      createMany: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

describe("Session Aggregator Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("aggregateSessions - Session Grouping (AC #1)", () => {
    it("should group events by sessionId", async () => {
      // Arrange: Create events with different sessionIds
      const mockEvents = [
        {
          id: "1",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:00:00Z"),
          data: { url: "/home" },
          createdAt: new Date("2025-11-01T10:00:00Z"),
        },
        {
          id: "2",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:01:00Z"),
          data: { url: "/products" },
          createdAt: new Date("2025-11-01T10:01:00Z"),
        },
        {
          id: "3",
          siteId: "site1",
          sessionId: "session2",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:00:00Z"),
          data: { url: "/about" },
          createdAt: new Date("2025-11-01T10:00:00Z"),
        },
      ];

      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(mockEvents);

      // Act
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-02T00:00:00Z")
      );

      // Assert: Should create 2 separate sessions
      expect(sessions).toHaveLength(2);
      expect(sessions.map((s) => s.sessionId)).toContain("session1");
      expect(sessions.map((s) => s.sessionId)).toContain("session2");
    });

    it("should handle empty event dataset", async () => {
      // Arrange
      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue([]);

      // Act
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-02T00:00:00Z")
      );

      // Assert
      expect(sessions).toHaveLength(0);
    });

    it("should process multiple sites in single run", async () => {
      // Arrange: Events from different sites
      const mockEvents = [
        {
          id: "1",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:00:00Z"),
          data: { url: "/home" },
          createdAt: new Date("2025-11-01T10:00:00Z"),
        },
        {
          id: "2",
          siteId: "site2",
          sessionId: "session2",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:00:00Z"),
          data: { url: "/about" },
          createdAt: new Date("2025-11-01T10:00:00Z"),
        },
      ];

      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(mockEvents);

      // Act
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-02T00:00:00Z")
      );

      // Assert
      expect(sessions).toHaveLength(2);
      expect(sessions[0].siteId).toBe("site1");
      expect(sessions[1].siteId).toBe("site2");
    });
  });

  describe("aggregateSessions - Journey Extraction (AC #2)", () => {
    it("should extract journey path from pageview events", async () => {
      // Arrange: Session with multiple pageviews
      const mockEvents = [
        {
          id: "1",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:00:00Z"),
          data: { url: "/home" },
          createdAt: new Date("2025-11-01T10:00:00Z"),
        },
        {
          id: "2",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:01:00Z"),
          data: { url: "/products" },
          createdAt: new Date("2025-11-01T10:01:00Z"),
        },
        {
          id: "3",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:02:00Z"),
          data: { url: "/cart" },
          createdAt: new Date("2025-11-01T10:02:00Z"),
        },
      ];

      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(mockEvents);

      // Act
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-02T00:00:00Z")
      );

      // Assert
      expect(sessions).toHaveLength(1);
      expect(sessions[0].journeyPath).toEqual(["/home", "/products", "/cart"]);
      expect(sessions[0].entryPage).toBe("/home");
      expect(sessions[0].exitPage).toBe("/cart");
    });

    it("should filter out non-pageview events from journey", async () => {
      // Arrange: Mixed event types
      const mockEvents = [
        {
          id: "1",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:00:00Z"),
          data: { url: "/home" },
          createdAt: new Date("2025-11-01T10:00:00Z"),
        },
        {
          id: "2",
          siteId: "site1",
          sessionId: "session1",
          eventType: "click",
          timestamp: new Date("2025-11-01T10:00:30Z"),
          data: { button: "signup" },
          createdAt: new Date("2025-11-01T10:00:30Z"),
        },
        {
          id: "3",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:01:00Z"),
          data: { url: "/signup" },
          createdAt: new Date("2025-11-01T10:01:00Z"),
        },
      ];

      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(mockEvents);

      // Act
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-02T00:00:00Z")
      );

      // Assert: Journey should only include pageviews
      expect(sessions[0].journeyPath).toEqual(["/home", "/signup"]);
      expect(sessions[0].pageCount).toBe(2);
    });

    it("should handle session with single pageview (entry = exit)", async () => {
      // Arrange
      const mockEvents = [
        {
          id: "1",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:00:00Z"),
          data: { url: "/landing" },
          createdAt: new Date("2025-11-01T10:00:00Z"),
        },
      ];

      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(mockEvents);

      // Act
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-02T00:00:00Z")
      );

      // Assert
      expect(sessions[0].entryPage).toBe("/landing");
      expect(sessions[0].exitPage).toBe("/landing");
      expect(sessions[0].journeyPath).toEqual(["/landing"]);
    });
  });

  describe("aggregateSessions - Metadata Calculations (AC #3)", () => {
    it("should calculate session duration correctly", async () => {
      // Arrange: Events spanning 2 minutes
      const mockEvents = [
        {
          id: "1",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:00:00Z"),
          data: { url: "/home" },
          createdAt: new Date("2025-11-01T10:00:00Z"),
        },
        {
          id: "2",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:02:00Z"),
          data: { url: "/about" },
          createdAt: new Date("2025-11-01T10:02:00Z"),
        },
      ];

      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(mockEvents);

      // Act
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-02T00:00:00Z")
      );

      // Assert: Duration should be 120 seconds (2 minutes)
      expect(sessions[0].duration).toBe(120);
    });

    it("should set duration to null for single-event sessions", async () => {
      // Arrange
      const mockEvents = [
        {
          id: "1",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:00:00Z"),
          data: { url: "/home" },
          createdAt: new Date("2025-11-01T10:00:00Z"),
        },
      ];

      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(mockEvents);

      // Act
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-02T00:00:00Z")
      );

      // Assert
      expect(sessions[0].duration).toBeNull();
    });

    it("should count pageviews correctly", async () => {
      // Arrange
      const mockEvents = [
        {
          id: "1",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:00:00Z"),
          data: { url: "/page1" },
          createdAt: new Date("2025-11-01T10:00:00Z"),
        },
        {
          id: "2",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:01:00Z"),
          data: { url: "/page2" },
          createdAt: new Date("2025-11-01T10:01:00Z"),
        },
        {
          id: "3",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:02:00Z"),
          data: { url: "/page3" },
          createdAt: new Date("2025-11-01T10:02:00Z"),
        },
      ];

      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(mockEvents);

      // Act
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-02T00:00:00Z")
      );

      // Assert
      expect(sessions[0].pageCount).toBe(3);
    });

    it("should detect bounce (single pageview)", async () => {
      // Arrange
      const mockEvents = [
        {
          id: "1",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:00:00Z"),
          data: { url: "/landing" },
          createdAt: new Date("2025-11-01T10:00:00Z"),
        },
      ];

      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(mockEvents);

      // Act
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-02T00:00:00Z")
      );

      // Assert
      expect(sessions[0].bounced).toBe(true);
      expect(sessions[0].pageCount).toBe(1);
    });

    it("should not be bounced when multiple pageviews", async () => {
      // Arrange
      const mockEvents = [
        {
          id: "1",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:00:00Z"),
          data: { url: "/home" },
          createdAt: new Date("2025-11-01T10:00:00Z"),
        },
        {
          id: "2",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:01:00Z"),
          data: { url: "/about" },
          createdAt: new Date("2025-11-01T10:01:00Z"),
        },
      ];

      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(mockEvents);

      // Act
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-02T00:00:00Z")
      );

      // Assert
      expect(sessions[0].bounced).toBe(false);
    });

    it("should detect conversion event", async () => {
      // Arrange: Session with conversion
      const mockEvents = [
        {
          id: "1",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:00:00Z"),
          data: { url: "/home" },
          createdAt: new Date("2025-11-01T10:00:00Z"),
        },
        {
          id: "2",
          siteId: "site1",
          sessionId: "session1",
          eventType: "conversion",
          timestamp: new Date("2025-11-01T10:05:00Z"),
          data: { value: 99.99 },
          createdAt: new Date("2025-11-01T10:05:00Z"),
        },
      ];

      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(mockEvents);

      // Act
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-02T00:00:00Z")
      );

      // Assert
      expect(sessions[0].converted).toBe(true);
    });

    it("should not be converted without conversion event", async () => {
      // Arrange
      const mockEvents = [
        {
          id: "1",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T10:00:00Z"),
          data: { url: "/home" },
          createdAt: new Date("2025-11-01T10:00:00Z"),
        },
      ];

      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(mockEvents);

      // Act
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-02T00:00:00Z")
      );

      // Assert
      expect(sessions[0].converted).toBe(false);
    });
  });

  describe("createSessions - Storage (AC #5)", () => {
    it("should use createMany for bulk insert", async () => {
      // Arrange
      const sessions = [
        {
          siteId: "site1",
          sessionId: "session1",
          entryPage: "/home",
          exitPage: "/about",
          duration: 120,
          pageCount: 2,
          bounced: false,
          converted: false,
          journeyPath: ["/home", "/about"],
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.session.createMany).mockResolvedValue({ count: 1 });

      // Act
      const result = await createSessions(sessions);

      // Assert
      expect(prisma.session.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            sessionId: "session1",
            siteId: "site1",
          }),
        ]),
        skipDuplicates: true,
      });
      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle bulk insert errors with fallback upserts", async () => {
      // Arrange
      const sessions = [
        {
          siteId: "site1",
          sessionId: "session1",
          entryPage: "/home",
          exitPage: null,
          duration: null,
          pageCount: 1,
          bounced: true,
          converted: false,
          journeyPath: ["/home"],
          createdAt: new Date(),
        },
      ];

      // Simulate createMany failure
      vi.mocked(prisma.session.createMany).mockRejectedValue(
        new Error("Duplicate key error")
      );

      // Mock upsert success
      vi.mocked(prisma.session.upsert).mockResolvedValue({
        id: "1",
        siteId: "site1",
        sessionId: "session1",
        entryPage: "/home",
        exitPage: null,
        duration: null,
        pageCount: 1,
        bounced: true,
        converted: false,
        journeyPath: ["/home"],
        createdAt: new Date(),
      });

      // Act
      const result = await createSessions(sessions);

      // Assert: Should fall back to upsert
      expect(prisma.session.upsert).toHaveBeenCalled();
      expect(result.created).toBe(1);
    });
  });

  describe("calculateJourneyFunnels - Visualization (AC #6)", () => {
    it("should calculate funnel stages and drop-off rates", async () => {
      // Arrange: Mock sessions with different journey paths
      const mockSessions = [
        { journeyPath: ["/", "/product/123"], converted: false },
        { journeyPath: ["/", "/product/456", "/cart"], converted: false },
        {
          journeyPath: ["/", "/product/789", "/cart", "/checkout"],
          converted: false,
        },
        {
          journeyPath: [
            "/",
            "/product/101",
            "/cart",
            "/checkout",
            "/confirmation",
          ],
          converted: true,
        },
      ];

      vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions as any);

      // Act
      const funnelData = await calculateJourneyFunnels("site1");

      // Assert
      expect(funnelData.siteId).toBe("site1");
      expect(funnelData.totalSessions).toBe(4);
      expect(funnelData.conversionRate).toBe(25); // 1 out of 4
      expect(funnelData.funnels.length).toBeGreaterThan(0);

      // Entry stage should have all visitors
      const entryStage = funnelData.funnels.find((f) => f.stage === "Entry");
      expect(entryStage?.visitors).toBe(4);
    });

    it("should handle empty session data gracefully", async () => {
      // Arrange
      vi.mocked(prisma.session.findMany).mockResolvedValue([]);

      // Act
      const funnelData = await calculateJourneyFunnels("site1");

      // Assert
      expect(funnelData.totalSessions).toBe(0);
      expect(funnelData.conversionRate).toBe(0);
      expect(funnelData.funnels).toHaveLength(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle session with no pageviews", async () => {
      // Arrange: Only non-pageview events
      const mockEvents = [
        {
          id: "1",
          siteId: "site1",
          sessionId: "session1",
          eventType: "click",
          timestamp: new Date("2025-11-01T10:00:00Z"),
          data: { button: "subscribe" },
          createdAt: new Date("2025-11-01T10:00:00Z"),
        },
      ];

      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(mockEvents);

      // Act
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-02T00:00:00Z")
      );

      // Assert
      expect(sessions[0].pageCount).toBe(0);
      expect(sessions[0].journeyPath).toEqual([]);
      expect(sessions[0].entryPage).toBe("");
    });

    it("should handle sessions spanning multiple days", async () => {
      // Arrange: Session starting on day 1, ending on day 2
      const mockEvents = [
        {
          id: "1",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-01T23:59:00Z"),
          data: { url: "/home" },
          createdAt: new Date("2025-11-01T23:59:00Z"),
        },
        {
          id: "2",
          siteId: "site1",
          sessionId: "session1",
          eventType: "pageview",
          timestamp: new Date("2025-11-02T00:01:00Z"),
          data: { url: "/about" },
          createdAt: new Date("2025-11-02T00:01:00Z"),
        },
      ];

      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(mockEvents);

      // Act
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-03T00:00:00Z")
      );

      // Assert: Should treat as single session
      expect(sessions).toHaveLength(1);
      expect(sessions[0].duration).toBe(120); // 2 minutes
    });

    it("should handle very large sessions efficiently", async () => {
      // Arrange: Session with 100 events
      const mockEvents = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        siteId: "site1",
        sessionId: "session1",
        eventType: "pageview",
        timestamp: new Date(`2025-11-01T10:${String(i).padStart(2, "0")}:00Z`),
        data: { url: `/page${i}` },
        createdAt: new Date(`2025-11-01T10:${String(i).padStart(2, "0")}:00Z`),
      }));

      vi.mocked(prisma.trackingEvent.findMany).mockResolvedValue(mockEvents);

      // Act
      const startTime = performance.now();
      const sessions = await aggregateSessions(
        new Date("2025-11-01T00:00:00Z"),
        new Date("2025-11-02T00:00:00Z")
      );
      const endTime = performance.now();

      // Assert
      expect(sessions).toHaveLength(1);
      expect(sessions[0].pageCount).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should process in <1 second
    });
  });
});
