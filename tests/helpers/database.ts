/**
 * Database Test Utilities
 * Provides helper functions for managing test database state
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { nanoid } from 'nanoid';

// Use TEST_DATABASE_URL if available, otherwise fall back to DATABASE_URL
const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or TEST_DATABASE_URL must be set for tests');
}

// Create a dedicated Prisma client for tests
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

/**
 * Clear all data from the database
 * Uses PostgreSQL CASCADE DELETE with proper ordering
 */
export async function clearDatabase(): Promise<void> {
  try {
    // Wrap everything in a transaction for atomicity
    await testPrisma.$transaction(
      async (tx) => {
        // Delete child tables first (no foreign key dependencies)
        await tx.$executeRaw`DELETE FROM "ShopifyOrder"`;
        await tx.$executeRaw`DELETE FROM "ShopifyStore"`;
        await tx.$executeRaw`DELETE FROM "Recommendation"`;
        await tx.$executeRaw`DELETE FROM "Pattern"`;
        await tx.$executeRaw`DELETE FROM "Session"`;
        await tx.$executeRaw`DELETE FROM "TrackingEvent"`;

        // Remove peer group references from businesses
        await tx.$executeRaw`UPDATE "Business" SET "peerGroupId" = NULL`;

        // Delete businesses (references users)
        await tx.$executeRaw`DELETE FROM "Business"`;

        // Delete peer groups (no foreign key dependencies after businesses cleared)
        await tx.$executeRaw`DELETE FROM "PeerGroup"`;

        // Finally delete users (no more foreign key references)
        await tx.$executeRaw`DELETE FROM "User"`;
      },
      {
        maxWait: 10000, // 10 seconds max wait
        timeout: 30000, // 30 seconds timeout
      }
    );
  } catch (error) {
    console.error('Error clearing database:', error);
    // Log but don't throw - allow tests to continue
    // Some tests might already be in a failed state
  }
}

/**
 * Create a test user with hashed password
 */
export async function createTestUser(
  email: string,
  password: string = 'TestPassword123!',
  emailVerified: boolean = true
) {
  const passwordHash = await hash(password, 10);

  return testPrisma.user.create({
    data: {
      email,
      passwordHash,
      emailVerified,
    },
  });
}

/**
 * Create a test business with associated user
 */
export async function seedBusiness(profile: {
  name: string;
  industry: string;
  revenueRange: string;
  productTypes: string[];
  platform: string;
  email?: string;
}) {
  const email = profile.email || `${profile.name.toLowerCase().replace(/\s+/g, '.')}@test.com`;

  // Create user first
  const user = await createTestUser(email);

  // Create business
  const business = await testPrisma.business.create({
    data: {
      userId: user.id,
      name: profile.name,
      industry: profile.industry,
      revenueRange: profile.revenueRange,
      productTypes: profile.productTypes,
      platform: profile.platform,
      siteId: `test_site_${nanoid(10)}`,
    },
    include: {
      user: true,
    },
  });

  return business;
}

/**
 * Create multiple test businesses
 */
export async function seedBusinesses(
  profiles: Array<{
    name: string;
    industry: string;
    revenueRange: string;
    productTypes: string[];
    platform: string;
  }>
) {
  const businesses = [];
  for (const profile of profiles) {
    businesses.push(await seedBusiness(profile));
  }
  return businesses;
}

/**
 * Wait for Inngest job completion
 * Polls database for expected state changes
 */
export async function waitForJobCompletion(
  checkFunction: () => Promise<boolean>,
  timeoutMs: number = 30000,
  intervalMs: number = 500
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await checkFunction()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Job did not complete within ${timeoutMs}ms`);
}

/**
 * Create test tracking events in database
 */
export async function createTestTrackingEvents(events: Array<{
  siteId: string;
  sessionId: string;
  eventType: string;
  timestamp: Date;
  data: any;
}>) {
  return testPrisma.trackingEvent.createMany({
    data: events.map((event) => ({
      siteId: event.siteId,
      sessionId: event.sessionId,
      eventType: event.eventType,
      timestamp: event.timestamp,
      data: event.data,
    })),
  });
}

/**
 * Get session count for a site
 */
export async function getSessionCount(siteId: string): Promise<number> {
  return testPrisma.session.count({
    where: { siteId },
  });
}

/**
 * Get pattern count for a site
 */
export async function getPatternCount(siteId: string): Promise<number> {
  return testPrisma.pattern.count({
    where: { siteId },
  });
}

/**
 * Get recommendation count for a business
 */
export async function getRecommendationCount(businessId: string): Promise<number> {
  return testPrisma.recommendation.count({
    where: { businessId },
  });
}

/**
 * Close database connection
 */
export async function disconnectDatabase(): Promise<void> {
  await testPrisma.$disconnect();
}
