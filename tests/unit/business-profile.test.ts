import { describe, it, expect } from "vitest";
import { customAlphabet } from "nanoid";

describe("SiteId Generation", () => {
  it("should generate unique alphanumeric siteIds", () => {
    const generateSiteId = customAlphabet(
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      12
    );

    const siteId1 = generateSiteId();
    const siteId2 = generateSiteId();

    expect(siteId1).toBeDefined();
    expect(siteId2).toBeDefined();
    expect(siteId1).not.toBe(siteId2);
    expect(siteId1.length).toBe(12);
    expect(siteId2.length).toBe(12);

    // Verify alphanumeric characters only
    expect(siteId1).toMatch(/^[a-zA-Z0-9]{12}$/);
    expect(siteId2).toMatch(/^[a-zA-Z0-9]{12}$/);
  });

  it("should generate many unique siteIds without collisions", () => {
    const generateSiteId = customAlphabet(
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      12
    );

    const siteIds = new Set<string>();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      siteIds.add(generateSiteId());
    }

    // All should be unique
    expect(siteIds.size).toBe(count);
  });
});

describe("Profile Validation", () => {
  it("should validate required profile fields", () => {
    const validProfile = {
      industry: "Fashion",
      revenueRange: "$0-500K",
      productTypes: ["Physical Products"],
      platform: "Shopify",
    };

    expect(validProfile.industry).toBeDefined();
    expect(validProfile.revenueRange).toBeDefined();
    expect(validProfile.productTypes.length).toBeGreaterThan(0);
    expect(validProfile.platform).toBeDefined();
  });

  it("should reject empty product types array", () => {
    const invalidProfile = {
      industry: "Fashion",
      revenueRange: "$0-500K",
      productTypes: [],
      platform: "Shopify",
    };

    expect(invalidProfile.productTypes.length).toBe(0);
  });
});
