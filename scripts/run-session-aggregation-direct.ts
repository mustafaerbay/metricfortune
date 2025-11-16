#!/usr/bin/env tsx
/**
 * Direct Session Aggregation (Bypasses Inngest)
 *
 * Runs session aggregation synchronously without Inngest
 * Use this for local development or troubleshooting
 *
 * Usage: npx tsx scripts/run-session-aggregation-direct.ts
 */

import { prisma } from '../src/lib/prisma';
import { aggregateSessions, createSessions } from '../src/services/analytics/session-aggregator';

async function main() {
  console.log('🚀 Running Session Aggregation Directly...\n');

  try {
    // Step 1: Determine time range
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

    console.log(`📅 Processing events from ${startTime.toISOString()} to ${endTime.toISOString()}\n`);

    // Step 2: Check tracking events
    const eventCount = await prisma.trackingEvent.count({
      where: {
        timestamp: {
          gte: startTime,
          lte: endTime,
        },
      },
    });

    console.log(`📊 Found ${eventCount} tracking events in time range`);

    if (eventCount === 0) {
      console.log('❌ No tracking events found. Visit your website first!\n');
      return;
    }

    // Step 3: Aggregate sessions
    console.log('⚙️  Aggregating sessions from tracking events...\n');
    const sessionsData = await aggregateSessions(startTime, endTime);

    console.log(`✅ Aggregated ${sessionsData.length} sessions\n`);

    if (sessionsData.length === 0) {
      console.log('⚠️  No sessions to create (might be duplicate sessionIds)\n');
      return;
    }

    // Step 4: Store sessions
    console.log('💾 Storing sessions in database...');
    const result = await createSessions(sessionsData);

    console.log(`\n✅ Session Aggregation Complete!`);
    console.log(`   Sessions created: ${result.created}`);
    console.log(`   Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    // Step 5: Verify sessions were created
    console.log('\n🔍 Verifying sessions...');
    const sessionCount = await prisma.session.count();
    console.log(`   Total sessions in database: ${sessionCount}`);

    const recentSessions = await prisma.session.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        sessionId: true,
        entryPage: true,
        pageCount: true,
        converted: true,
        siteId: true,
      },
    });

    console.log('\n   Recent sessions:');
    recentSessions.forEach((session) => {
      console.log(`     - ${session.sessionId.substring(0, 12)}... | Entry: ${session.entryPage} | Pages: ${session.pageCount} | Site: ${session.siteId}`);
    });

    console.log('\n🎉 Done! You can now view Journey Insights at /dashboard/journey-insights\n');

  } catch (error) {
    console.error('\n❌ Error during session aggregation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
