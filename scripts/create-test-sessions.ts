#!/usr/bin/env tsx
/**
 * Create Test Sessions for Journey Insights Testing
 *
 * Creates realistic test session data with varied journey paths
 * to demonstrate the funnel visualization
 *
 * Usage: npx tsx scripts/create-test-sessions.ts [siteId]
 */

import { prisma } from '../src/lib/prisma';
import { randomBytes } from 'crypto';

function generateSessionId(): string {
  return randomBytes(16).toString('hex');
}

async function main() {
  const siteId = process.argv[2] || 'site_zGTEgkgBWGLXriJa';

  console.log(`🚀 Creating test sessions for siteId: ${siteId}\n`);

  // Check if business exists
  const business = await prisma.business.findFirst({
    where: { siteId },
  });

  if (!business) {
    console.log(`❌ No business found with siteId: ${siteId}`);
    console.log('\nAvailable businesses:');
    const businesses = await prisma.business.findMany();
    businesses.forEach(b => console.log(`  - ${b.name}: ${b.siteId}`));
    process.exit(1);
  }

  console.log(`✅ Found business: ${business.name}\n`);

  const baseTime = new Date();
  const testSessions = [
    // Complete journey - conversion
    {
      sessionId: generateSessionId(),
      siteId,
      entryPage: '/',
      exitPage: '/thank-you',
      pageCount: 5,
      bounced: false,
      converted: true,
      journeyPath: ['/', '/products/item-1', '/cart', '/checkout', '/thank-you'],
      duration: 420,
      createdAt: new Date(baseTime.getTime() - 1 * 60 * 60 * 1000),
    },
    // Journey to checkout (abandoned)
    {
      sessionId: generateSessionId(),
      siteId,
      entryPage: '/',
      exitPage: '/checkout',
      pageCount: 4,
      bounced: false,
      converted: false,
      journeyPath: ['/', '/products/item-2', '/cart', '/checkout'],
      duration: 320,
      createdAt: new Date(baseTime.getTime() - 2 * 60 * 60 * 1000),
    },
    // Journey to cart (abandoned)
    {
      sessionId: generateSessionId(),
      siteId,
      entryPage: '/',
      exitPage: '/cart',
      pageCount: 3,
      bounced: false,
      converted: false,
      journeyPath: ['/', '/products/item-3', '/cart'],
      duration: 180,
      createdAt: new Date(baseTime.getTime() - 3 * 60 * 60 * 1000),
    },
    // Product view only
    {
      sessionId: generateSessionId(),
      siteId,
      entryPage: '/',
      exitPage: '/products/item-4',
      pageCount: 2,
      bounced: false,
      converted: false,
      journeyPath: ['/', '/products/item-4'],
      duration: 90,
      createdAt: new Date(baseTime.getTime() - 4 * 60 * 60 * 1000),
    },
    // Bounce (single page)
    {
      sessionId: generateSessionId(),
      siteId,
      entryPage: '/',
      exitPage: '/',
      pageCount: 1,
      bounced: true,
      converted: false,
      journeyPath: ['/'],
      duration: 15,
      createdAt: new Date(baseTime.getTime() - 5 * 60 * 60 * 1000),
    },
    // Another complete conversion
    {
      sessionId: generateSessionId(),
      siteId,
      entryPage: '/products/item-5',
      exitPage: '/thank-you',
      pageCount: 4,
      bounced: false,
      converted: true,
      journeyPath: ['/products/item-5', '/cart', '/checkout', '/thank-you'],
      duration: 280,
      createdAt: new Date(baseTime.getTime() - 6 * 60 * 60 * 1000),
    },
    // Search entry -> product
    {
      sessionId: generateSessionId(),
      siteId,
      entryPage: '/search?q=shoes',
      exitPage: '/products/item-6',
      pageCount: 2,
      bounced: false,
      converted: false,
      journeyPath: ['/search?q=shoes', '/products/item-6'],
      duration: 120,
      createdAt: new Date(baseTime.getTime() - 7 * 60 * 60 * 1000),
    },
  ];

  console.log(`📦 Creating ${testSessions.length} test sessions...\n`);

  let created = 0;
  let errors = 0;

  for (const session of testSessions) {
    try {
      await prisma.session.create({ data: session });
      created++;
      console.log(`✅ Created: ${session.journeyPath.join(' → ')}`);
    } catch (error) {
      errors++;
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`\n✅ Test sessions created!`);
  console.log(`   Created: ${created}`);
  console.log(`   Errors: ${errors}`);

  // Show summary
  const totalSessions = await prisma.session.count({ where: { siteId } });
  const conversions = await prisma.session.count({
    where: { siteId, converted: true }
  });

  console.log(`\n📊 Business Summary:`);
  console.log(`   Total sessions: ${totalSessions}`);
  console.log(`   Conversions: ${conversions}`);
  console.log(`   Conversion rate: ${((conversions / totalSessions) * 100).toFixed(1)}%`);

  console.log(`\n🎉 Ready! Visit /dashboard/journey-insights to see your funnel\n`);

  await prisma.$disconnect();
}

main();
