#!/usr/bin/env tsx
/**
 * Manual Session Aggregation Trigger Script
 *
 * Run this script to immediately process tracking events into sessions
 * without waiting for the cron schedule.
 *
 * Usage:
 *   npx tsx scripts/trigger-session-aggregation.ts
 */

import { inngest } from '../src/lib/inngest';

async function main() {
  console.log('🚀 Triggering session aggregation job...\n');

  try {
    const result = await inngest.send({
      name: 'session/aggregate',
      data: {
        triggeredBy: 'manual-script',
        timestamp: new Date().toISOString(),
      },
    });

    console.log('✅ Session aggregation job triggered successfully!');
    console.log('\nJob Details:');
    console.log(`  Job ID: ${result.ids[0]}`);
    console.log('\n📊 Next Steps:');
    console.log('  1. Check your Inngest dashboard to see job progress');
    console.log('  2. Or watch server logs for aggregation output');
    console.log('  3. Query the Session table to verify sessions were created\n');
    console.log('💡 Tip: The job processes tracking events from the last 24 hours');
    console.log('   (or since last run if sessions already exist)\n');
  } catch (error) {
    console.error('❌ Error triggering session aggregation:', error);
    console.error('\n🔍 Troubleshooting:');
    console.error('  - Make sure Inngest is running (check INNGEST_EVENT_KEY in .env)');
    console.error('  - Verify your database connection');
    console.error('  - Check that tracking events exist in TrackingEvent table\n');
    process.exit(1);
  }
}

main();
