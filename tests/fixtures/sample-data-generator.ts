/**
 * Sample Data Generator
 * Creates comprehensive test fixtures combining businesses and tracking data
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { generateBusinesses, type GeneratedBusiness } from './business-generator';
import {
  generateMultipleSessions,
  exportSessionsToJSON,
  type SessionConfig,
} from './tracking-data-generator';

export interface TestDataSet {
  businesses: GeneratedBusiness[];
  trackingSessions: Record<string, any[][]>; // siteId -> sessions
}

/**
 * Generate a complete test data set
 */
export function generateCompleteTestData(businessCount: number = 10): TestDataSet {
  // Generate businesses
  const businesses = generateBusinesses(businessCount);

  // Generate tracking sessions for each business
  const trackingSessions: Record<string, any[][]> = {};

  businesses.forEach((business) => {
    const siteId = business.business.siteId;
    // Generate 50-200 sessions per business for variety
    const sessionCount = Math.floor(Math.random() * 151) + 50;
    trackingSessions[siteId] = generateMultipleSessions(siteId, sessionCount);
  });

  return {
    businesses,
    trackingSessions,
  };
}

/**
 * Generate and save test fixtures to files
 */
export function generateAndSaveFixtures(outputDir: string = './tests/fixtures/data'): void {
  // Create output directory if it doesn't exist
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore
  }

  // Generate small dataset (10 businesses)
  const smallData = generateCompleteTestData(10);
  writeFileSync(
    join(outputDir, 'small-dataset.json'),
    JSON.stringify(smallData, null, 2)
  );

  // Generate medium dataset (25 businesses)
  const mediumData = generateCompleteTestData(25);
  writeFileSync(
    join(outputDir, 'medium-dataset.json'),
    JSON.stringify(mediumData, null, 2)
  );

  // Generate individual business samples
  writeFileSync(
    join(outputDir, 'sample-businesses.json'),
    JSON.stringify(smallData.businesses, null, 2)
  );

  // Generate sample sessions for one business
  const sampleSiteId = smallData.businesses[0].business.siteId;
  writeFileSync(
    join(outputDir, 'sample-sessions.json'),
    exportSessionsToJSON(smallData.trackingSessions[sampleSiteId])
  );

  console.log(`✅ Test fixtures generated in ${outputDir}/`);
  console.log(`   - small-dataset.json (10 businesses)`);
  console.log(`   - medium-dataset.json (25 businesses)`);
  console.log(`   - sample-businesses.json (10 business profiles)`);
  console.log(`   - sample-sessions.json (sample tracking sessions)`);
}

// Run if executed directly
if (require.main === module) {
  generateAndSaveFixtures();
}
