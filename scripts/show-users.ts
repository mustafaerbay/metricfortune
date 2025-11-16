#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      business: {
        select: {
          name: true,
          siteId: true,
        }
      }
    }
  });

  console.log('\n👥 Users and their businesses:\n');

  for (const user of users) {
    console.log(`  📧 Email: ${user.email}`);
    if (user.business) {
      console.log(`     Business: ${user.business.name}`);
      console.log(`     SiteId: ${user.business.siteId}`);

      // Count sessions for this business
      const sessionCount = await prisma.session.count({
        where: { siteId: user.business.siteId }
      });
      console.log(`     Sessions: ${sessionCount} ${sessionCount > 0 ? '✅' : '❌'}`);
    } else {
      console.log(`     Business: None`);
    }
    console.log('');
  }

  console.log('💡 Sign in with the user that has sessions (✅) to view Journey Insights\n');

  await prisma.$disconnect();
}

main();
