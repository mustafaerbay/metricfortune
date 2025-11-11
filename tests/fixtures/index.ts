/**
 * Test Fixtures Index
 * Centralized exports for test data generators
 */

export {
  generateBusiness,
  generateBusinesses,
  generateSpecificBusiness,
  getAvailableIndustries,
  getAvailableRevenueRanges,
  getAvailablePlatforms,
  type GeneratedBusiness,
} from './business-generator';

export {
  generateSession,
  generateMultipleSessions,
  generateVolumeTestData,
  generateSessionId,
  exportSessionsToJSON,
  exportEventsToJSON,
  VOLUME_CONFIGS,
  type SessionConfig,
  type VolumeConfig,
} from './tracking-data-generator';

export {
  generateCompleteTestData,
  generateAndSaveFixtures,
  type TestDataSet,
} from './sample-data-generator';
