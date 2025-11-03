/**
 * Backfill Peer Groups Script
 *
 * Calculates peer groups for all existing businesses that don't have one yet.
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   npx tsx scripts/backfill-peer-groups.ts
 *
 * Options:
 *   --dry-run: Show what would be done without making changes
 *   --force: Recalculate peer groups even for businesses that already have one
 */

import { PrismaClient } from "@prisma/client";
import { calculatePeerGroup } from "../src/services/matching/business-matcher";

const prisma = new PrismaClient();

interface BackfillStats {
  totalBusinesses: number;
  businessesWithoutPeerGroup: number;
  businessesProcessed: number;
  successfulCalculations: number;
  failedCalculations: number;
  skipped: number;
  errors: Array<{ businessId: string; error: string }>;
}

async function backfillPeerGroups(options: {
  dryRun?: boolean;
  force?: boolean;
}): Promise<BackfillStats> {
  const { dryRun = false, force = false } = options;

  console.log("🚀 Starting peer group backfill...");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Force recalculation: ${force ? "YES" : "NO"}`);
  console.log("─".repeat(60));

  const stats: BackfillStats = {
    totalBusinesses: 0,
    businessesWithoutPeerGroup: 0,
    businessesProcessed: 0,
    successfulCalculations: 0,
    failedCalculations: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Get all businesses
    const allBusinesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        industry: true,
        revenueRange: true,
        peerGroupId: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    stats.totalBusinesses = allBusinesses.length;
    console.log(`\n📊 Found ${stats.totalBusinesses} total businesses\n`);

    if (stats.totalBusinesses === 0) {
      console.log("⚠️  No businesses found in database");
      return stats;
    }

    // Filter businesses that need peer group calculation
    const businessesToProcess = allBusinesses.filter((business) => {
      if (force) {
        return true; // Process all if force flag is set
      }
      return !business.peerGroupId; // Only process if no peer group
    });

    stats.businessesWithoutPeerGroup = businessesToProcess.length;

    if (stats.businessesWithoutPeerGroup === 0) {
      console.log("✅ All businesses already have peer groups assigned");
      console.log(
        "💡 Use --force flag to recalculate peer groups for all businesses"
      );
      return stats;
    }

    console.log(
      `📋 ${stats.businessesWithoutPeerGroup} businesses need peer group calculation\n`
    );

    // Process each business
    for (const business of businessesToProcess) {
      stats.businessesProcessed++;

      console.log(
        `[${stats.businessesProcessed}/${stats.businessesWithoutPeerGroup}] Processing business: ${business.name || business.id}`
      );
      console.log(`  Industry: ${business.industry}`);
      console.log(`  Revenue: ${business.revenueRange}`);
      console.log(
        `  Current peer group: ${business.peerGroupId || "None"}`
      );

      if (dryRun) {
        console.log("  ⏭️  Skipped (dry run mode)\n");
        stats.skipped++;
        continue;
      }

      try {
        // Calculate peer group
        const startTime = Date.now();
        const result = await calculatePeerGroup(business.id);
        const executionTime = Date.now() - startTime;

        console.log(`  ✅ Success (${executionTime}ms)`);
        console.log(`     Peer group ID: ${result.peerGroupId}`);
        console.log(`     Peers found: ${result.matchCount}`);
        console.log(`     Match tier: ${result.matchCriteria.tier}\n`);

        stats.successfulCalculations++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`  ❌ Failed: ${errorMessage}\n`);

        stats.failedCalculations++;
        stats.errors.push({
          businessId: business.id,
          error: errorMessage,
        });
      }
    }

    console.log("─".repeat(60));
    console.log("\n📊 Backfill Summary:");
    console.log(`   Total businesses: ${stats.totalBusinesses}`);
    console.log(
      `   Businesses without peer group: ${stats.businessesWithoutPeerGroup}`
    );
    console.log(`   Processed: ${stats.businessesProcessed}`);
    console.log(`   Successful: ${stats.successfulCalculations}`);
    console.log(`   Failed: ${stats.failedCalculations}`);
    console.log(`   Skipped: ${stats.skipped}`);

    if (stats.errors.length > 0) {
      console.log("\n❌ Errors:");
      stats.errors.forEach(({ businessId, error }) => {
        console.log(`   Business ${businessId}: ${error}`);
      });
    }

    if (dryRun) {
      console.log(
        "\n💡 This was a dry run. Run without --dry-run to apply changes."
      );
    } else if (stats.successfulCalculations > 0) {
      console.log("\n✅ Backfill completed successfully!");
    }
  } catch (error) {
    console.error("\n❌ Fatal error during backfill:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }

  return stats;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const help = args.includes("--help") || args.includes("-h");

if (help) {
  console.log(`
Backfill Peer Groups Script

Usage:
  npx tsx scripts/backfill-peer-groups.ts [options]

Options:
  --dry-run    Show what would be done without making changes
  --force      Recalculate peer groups even for businesses that already have one
  --help, -h   Show this help message

Examples:
  npx tsx scripts/backfill-peer-groups.ts --dry-run
  npx tsx scripts/backfill-peer-groups.ts
  npx tsx scripts/backfill-peer-groups.ts --force
`);
  process.exit(0);
}

// Run the backfill
backfillPeerGroups({ dryRun, force })
  .then((stats) => {
    const exitCode =
      stats.failedCalculations > 0 && stats.successfulCalculations === 0
        ? 1
        : 0;
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
