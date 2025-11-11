/**
 * Playwright Global Setup
 * Runs once before all E2E tests
 * Sets up test database and starts Inngest dev server
 */

import { execSync } from 'child_process';
import { testPrisma } from '../helpers/database';

async function globalSetup() {
  console.log('🔧 Setting up test environment...');

  // Ensure TEST_DATABASE_URL is set
  if (!process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set for E2E tests');
  }

  try {
    // Run Prisma migrations on test database
    console.log('📊 Running database migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    });

    // Verify database connection
    console.log('✓ Database migrations complete');
    await testPrisma.$connect();
    console.log('✓ Database connection verified');

    // Note: Inngest dev server should be started manually before running E2E tests
    // Run: npx inngest-cli@latest dev
    console.log('ℹ️  Ensure Inngest dev server is running: npx inngest-cli@latest dev');

    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Error setting up test environment:', error);
    throw error;
  }
}

export default globalSetup;
