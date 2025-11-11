/**
 * Playwright Global Teardown
 * Runs once after all E2E tests complete
 * Cleans up test database and stops services
 */

import { clearDatabase, disconnectDatabase } from '../helpers/database';

async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  try {
    // Clear test database
    console.log('📊 Clearing test database...');
    await clearDatabase();
    console.log('✓ Database cleared');

    // Disconnect from database
    await disconnectDatabase();
    console.log('✓ Database disconnected');

    // Note: Inngest dev server cleanup (if started programmatically)
    // For manual Inngest server, user must stop it manually

    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('❌ Error cleaning up test environment:', error);
    throw error;
  }
}

export default globalTeardown;
