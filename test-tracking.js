#!/usr/bin/env node

/**
 * Test script to verify tracking setup
 * Run with: node test-tracking.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing MetricFortune Tracking Setup\n');

  // 1. Check for existing businesses (siteIds)
  console.log('1. Checking for existing businesses...');
  const businesses = await prisma.business.findMany({
    select: {
      siteId: true,
      name: true,
    },
    take: 10,
  });

  if (businesses.length === 0) {
    console.log('❌ No businesses found in database!');
    console.log('   You need to create a business with a siteId first.\n');
    console.log('   Example:');
    console.log('   - Go to your signup flow and create a business');
    console.log('   - Or use Prisma Studio to create one manually\n');
  } else {
    console.log(`✅ Found ${businesses.length} business(es):\n`);
    businesses.forEach((b) => {
      console.log(`   - siteId: "${b.siteId}" (${b.name})`);
    });
    console.log();
  }

  // 2. Check for tracking events
  console.log('2. Checking for tracking events...');
  const eventCount = await prisma.trackingEvent.count();
  console.log(`   Total events in database: ${eventCount}`);

  if (eventCount > 0) {
    const recentEvents = await prisma.trackingEvent.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        siteId: true,
        eventType: true,
        timestamp: true,
        createdAt: true,
      },
    });
    console.log('\n   Recent events:');
    recentEvents.forEach((e) => {
      console.log(`   - ${e.eventType} (siteId: ${e.siteId}, timestamp: ${e.timestamp})`);
    });
  } else {
    console.log('   ℹ️  No events found yet\n');
  }

  // 3. Check for sessions
  console.log('\n3. Checking for sessions...');
  const sessionCount = await prisma.session.count();
  console.log(`   Total sessions in database: ${sessionCount}`);

  if (sessionCount > 0) {
    const recentSessions = await prisma.session.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        siteId: true,
        sessionId: true,
        entryPage: true,
        createdAt: true,
      },
    });
    console.log('\n   Recent sessions:');
    recentSessions.forEach((s) => {
      console.log(`   - ${s.sessionId.substring(0, 8)}... (siteId: ${s.siteId})`);
    });
  }

  console.log('\n---\n');
  console.log('📝 Integration Code:');
  console.log('Add this to your website HTML:\n');

  if (businesses.length > 0) {
    const siteId = businesses[0].siteId;
    console.log(`<script src="https://metricfortune.vercel.app/tracking.js"></script>`);
    console.log(`<script>`);
    console.log(`  MetricFortune.init({ siteId: '${siteId}' });`);
    console.log(`</script>\n`);
  } else {
    console.log('<script src="https://metricfortune.vercel.app/tracking.js"></script>');
    console.log('<script>');
    console.log('  MetricFortune.init({ siteId: "YOUR_SITE_ID_HERE" });');
    console.log('</script>\n');
    console.log('⚠️  Replace YOUR_SITE_ID_HERE with actual siteId from Business table\n');
  }

  console.log('🔗 API Endpoint:');
  console.log('   POST https://metricfortune.vercel.app/api/track\n');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
