/**
 * Integration Tests: Unsubscribe API Endpoint
 * Story 2.7: Email Notifications & Digests — AC #8
 *
 * Tests GET /api/unsubscribe with valid token, invalid token, and missing token.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testPrisma, clearDatabase } from '../../helpers/database';
import { GET } from '@/app/api/unsubscribe/route';
import { NextRequest } from 'next/server';

const APP_URL = 'http://localhost:3000';

function makeRequest(token?: string): NextRequest {
  const url = token
    ? `${APP_URL}/api/unsubscribe?token=${token}`
    : `${APP_URL}/api/unsubscribe`;
  return new NextRequest(url);
}

const TEST_USER_ID = 'unsubscribe-test-user';
const TEST_TOKEN = 'valid-unsubscribe-token-abc123';

async function createTestUser(overrides: Record<string, unknown> = {}) {
  return testPrisma.user.create({
    data: {
      id: TEST_USER_ID,
      email: `${TEST_USER_ID}@example.com`,
      passwordHash: 'hashed-password',
      emailVerified: true,
      emailNotificationsEnabled: true,
      emailUnsubscribeToken: TEST_TOKEN,
      ...overrides,
    },
  });
}

describe('GET /api/unsubscribe (AC #8)', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('sets emailNotificationsEnabled=false and redirects to /unsubscribed with valid token', async () => {
    await createTestUser();

    const response = await GET(makeRequest(TEST_TOKEN));

    expect(response.status).toBe(307); // redirect
    expect(response.headers.get('location')).toContain('/unsubscribed');
    expect(response.headers.get('location')).not.toContain('error');

    // Verify DB update
    const user = await testPrisma.user.findUnique({
      where: { id: TEST_USER_ID },
      select: { emailNotificationsEnabled: true },
    });
    expect(user?.emailNotificationsEnabled).toBe(false);
  });

  it('redirects to /unsubscribed?error=invalid for unknown token', async () => {
    await createTestUser();

    const response = await GET(makeRequest('bogus-token-xyz'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('error=invalid');
  });

  it('redirects to /unsubscribed?error=invalid when token param is missing', async () => {
    const response = await GET(makeRequest()); // no token

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('error=invalid');
  });

  it('works correctly for already-unsubscribed user (idempotent)', async () => {
    await createTestUser({ emailNotificationsEnabled: false });

    const response = await GET(makeRequest(TEST_TOKEN));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).not.toContain('error');

    const user = await testPrisma.user.findUnique({
      where: { id: TEST_USER_ID },
      select: { emailNotificationsEnabled: true },
    });
    expect(user?.emailNotificationsEnabled).toBe(false);
  });
});
