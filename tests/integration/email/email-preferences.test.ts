/**
 * Integration Tests: Email Preferences Server Action
 * Story 2.7: Email Notifications & Digests — AC #5
 *
 * Tests updateEmailPreferences Server Action with auth, validation, and DB persistence.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateEmailPreferences, getEmailPreferences } from '@/actions/email-preferences';
import { testPrisma, clearDatabase } from '../../helpers/database';

// Mock next/cache to avoid Next.js runtime dependency
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

const TEST_USER_ID = 'email-prefs-test-user';

async function createTestUser(id = TEST_USER_ID) {
  return testPrisma.user.create({
    data: {
      id,
      email: `${id}@example.com`,
      passwordHash: 'hashed-password',
      emailVerified: true,
    },
  });
}

describe('updateEmailPreferences Server Action (AC #5)', () => {
  beforeEach(async () => {
    await clearDatabase();
    await createTestUser();

    // Default: authenticated
    mockAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, email: `${TEST_USER_ID}@example.com` },
    });
  });

  it('returns error when unauthenticated (AC #5)', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await updateEmailPreferences({
      emailNotificationsEnabled: false,
      emailDigestFrequency: 'off',
      timezone: 'UTC',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Authentication required');
    }
  });

  it('persists emailNotificationsEnabled, emailDigestFrequency, timezone to DB (AC #5)', async () => {
    const result = await updateEmailPreferences({
      emailNotificationsEnabled: false,
      emailDigestFrequency: 'off',
      timezone: 'America/New_York',
    });

    expect(result.success).toBe(true);

    const user = await testPrisma.user.findUnique({
      where: { id: TEST_USER_ID },
      select: { emailNotificationsEnabled: true, emailDigestFrequency: true, timezone: true },
    });
    expect(user?.emailNotificationsEnabled).toBe(false);
    expect(user?.emailDigestFrequency).toBe('off');
    expect(user?.timezone).toBe('America/New_York');
  });

  it('accepts valid emailDigestFrequency values (weekly and off)', async () => {
    const weeklyResult = await updateEmailPreferences({
      emailNotificationsEnabled: true,
      emailDigestFrequency: 'weekly',
      timezone: 'UTC',
    });
    expect(weeklyResult.success).toBe(true);

    const offResult = await updateEmailPreferences({
      emailNotificationsEnabled: false,
      emailDigestFrequency: 'off',
      timezone: 'UTC',
    });
    expect(offResult.success).toBe(true);
  });

  it('returns validation error for invalid emailDigestFrequency (AC #5)', async () => {
    const result = await updateEmailPreferences({
      emailNotificationsEnabled: true,
      emailDigestFrequency: 'daily' as 'weekly' | 'off', // invalid
      timezone: 'UTC',
    });

    expect(result.success).toBe(false);
  });

  it('returns validation error for timezone exceeding 50 chars (AC #5)', async () => {
    const result = await updateEmailPreferences({
      emailNotificationsEnabled: true,
      emailDigestFrequency: 'weekly',
      timezone: 'A'.repeat(51), // 51 chars — too long
    });

    expect(result.success).toBe(false);
  });
});

describe('getEmailPreferences Server Action', () => {
  beforeEach(async () => {
    await clearDatabase();
    await createTestUser();
    mockAuth.mockResolvedValue({
      user: { id: TEST_USER_ID, email: `${TEST_USER_ID}@example.com` },
    });
  });

  it('returns user preferences with defaults', async () => {
    const result = await getEmailPreferences();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.emailNotificationsEnabled).toBe(true);
      expect(result.data.emailDigestFrequency).toBe('weekly');
      expect(result.data.timezone).toBe('UTC');
    }
  });

  it('returns error when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const result = await getEmailPreferences();
    expect(result.success).toBe(false);
  });
});
