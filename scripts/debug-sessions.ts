#!/usr/bin/env tsx
/**
 * Debug Session Aggregation Issues
 *
 * This script diagnoses why Journey Insights page might be empty
 *
 * Usage: npx tsx scripts/debug-sessions.ts
 */

import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🔍 Debugging Session Aggregation Issues...\n');

  try {
    // Step 1: Check tracking events
    console.log('📊 Step 1: Checking TrackingEvent table...');
    const eventCount = await prisma.trackingEvent.count();
    console.log(`  Total tracking events: ${eventCount}`);

    if (eventCount === 0) {
      console.log('  ❌ No tracking events found!');
      console.log('  → Visit your website to generate tracking events first\n');
      return;
    }

    const recentEvents = await prisma.trackingEvent.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        siteId: true,
        sessionId: true,
        eventType: true,
        timestamp: true,
        data: true,
      },
    });

    console.log('  ✅ Recent tracking events:');
    recentEvents.forEach((event) => {
      console.log(`    - ${event.eventType} | Session: ${event.sessionId.substring(0, 8)}... | Site: ${event.siteId} | ${event.timestamp.toISOString()}`);
    });
    console.log();

    // Get unique siteIds
    const uniqueSites = await prisma.trackingEvent.findMany({
      distinct: ['siteId'],
      select: { siteId: true },
    });
    console.log(`  📍 Unique siteIds in tracking events: ${uniqueSites.map(s => s.siteId).join(', ')}\n`);

    // Step 2: Check sessions
    console.log('📊 Step 2: Checking Session table...');
    const sessionCount = await prisma.session.count();
    console.log(`  Total sessions: ${sessionCount}`);

    if (sessionCount === 0) {
      console.log('  ❌ No sessions found!');
      console.log('  → You need to run session aggregation\n');
      console.log('  Options:');
      console.log('    1. Run: npx tsx scripts/trigger-session-aggregation.ts');
      console.log('    2. Or POST to: /api/admin/trigger-session-aggregation');
      console.log('    3. Or wait for cron (runs every 4 hours)\n');
      return;
    }

    const recentSessions = await prisma.session.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        siteId: true,
        sessionId: true,
        entryPage: true,
        pageCount: true,
        converted: true,
        createdAt: true,
      },
    });

    console.log('  ✅ Recent sessions:');
    recentSessions.forEach((session) => {
      console.log(`    - Session: ${session.sessionId.substring(0, 8)}... | Entry: ${session.entryPage} | Pages: ${session.pageCount} | Converted: ${session.converted} | Site: ${session.siteId}`);
    });
    console.log();

    // Get unique siteIds in sessions
    const sessionSites = await prisma.session.findMany({
      distinct: ['siteId'],
      select: { siteId: true },
    });
    console.log(`  📍 Unique siteIds in sessions: ${sessionSites.map(s => s.siteId).join(', ')}\n`);

    // Step 3: Check businesses
    console.log('📊 Step 3: Checking Business table...');
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        siteId: true,
        userId: true,
      },
    });

    console.log(`  Total businesses: ${businesses.length}`);
    businesses.forEach((business) => {
      console.log(`    - ${business.name} | siteId: ${business.siteId} | userId: ${business.userId}`);
    });
    console.log();

    // Step 4: Check for siteId mismatch
    console.log('📊 Step 4: Checking for siteId mismatches...');
    const eventSiteIds = new Set(uniqueSites.map(s => s.siteId));
    const sessionSiteIds = new Set(sessionSites.map(s => s.siteId));
    const businessSiteIds = new Set(businesses.map(b => b.siteId));

    console.log('  SiteId Analysis:');
    console.log(`    Tracking Events: ${Array.from(eventSiteIds).join(', ')}`);
    console.log(`    Sessions: ${Array.from(sessionSiteIds).join(', ')}`);
    console.log(`    Businesses: ${Array.from(businessSiteIds).join(', ')}`);

    // Check if business siteIds match session siteIds
    const businessHasSessions = businesses.map(business => {
      const hasSessions = sessionSiteIds.has(business.siteId);
      return { business: business.name, siteId: business.siteId, hasSessions };
    });

    console.log('\n  Business → Session Matching:');
    businessHasSessions.forEach(({ business, siteId, hasSessions }) => {
      const status = hasSessions ? '✅' : '❌';
      console.log(`    ${status} ${business} (${siteId}): ${hasSessions ? 'Has sessions' : 'NO SESSIONS'}`);
    });

    // Step 5: Check date ranges
    if (sessionCount > 0) {
      console.log('\n📊 Step 5: Checking session date ranges...');

      const oldestSession = await prisma.session.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });

      const newestSession = await prisma.session.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      console.log(`  Oldest session: ${oldestSession?.createdAt.toISOString()}`);
      console.log(`  Newest session: ${newestSession?.createdAt.toISOString()}`);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sessionsLast30Days = await prisma.session.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });
      console.log(`  Sessions in last 30 days: ${sessionsLast30Days}`);
    }

    console.log('\n✅ Diagnosis complete!\n');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
