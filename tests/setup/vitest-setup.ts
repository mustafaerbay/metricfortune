/**
 * Vitest Setup File
 * Runs before each test file for unit and integration tests
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { clearDatabase, testPrisma } from '../helpers/database';

// Setup before all tests in a file
beforeAll(async () => {
  // Ensure database connection
  await testPrisma.$connect();
});

// Cleanup after all tests in a file
afterAll(async () => {
  await testPrisma.$disconnect();
});

// Clear database before each test for isolation
beforeEach(async () => {
  await clearDatabase();
}, 30000); // 30 second timeout for database operations

// Global test utilities (TypeScript declaration would be in test types file)
// @ts-ignore - global test utility
global.testPrisma = testPrisma;
