/**
 * Integration tests for Authentication Server Actions
 * Tests the auth.ts Server Actions with real database operations
 * AC #4: API integration tests for all endpoints (auth)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signUp, signIn, verifyEmail, resendVerificationEmail } from '@/actions/auth';
import { testPrisma } from '../../helpers/database';
import bcrypt from 'bcrypt';

// Mock Resend to avoid actual email sending in tests
vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(function(this: any) {
      this.emails = {
        send: vi.fn().mockResolvedValue({ id: 'mock-email-id' }),
      };
      return this;
    }),
  };
});

// Mock next-auth signIn
vi.mock('@/lib/auth', () => ({
  signIn: vi.fn().mockResolvedValue({ error: null }),
}));

describe('Authentication Server Actions Integration Tests', () => {
  const testEmail = 'test@example.com';
  const testPassword = 'SecurePass123!';
  const testBusinessName = 'Test Business';

  describe('signUp', () => {
    it('should create a new user with hashed password', async () => {
      const result = await signUp(testEmail, testPassword, testBusinessName);

      expect(result.success).toBe(true);
      expect(result.data?.userId).toBeDefined();

      // Verify user created in database
      const user = await testPrisma.user.findUnique({
        where: { email: testEmail },
        include: { business: true },
      });

      expect(user).toBeDefined();
      expect(user!.email).toBe(testEmail);
      expect(user!.emailVerified).toBe(false);
      expect(user!.emailVerificationToken).toBeDefined();

      // Verify password is hashed (not plain text)
      expect(user!.passwordHash).not.toBe(testPassword);
      const passwordMatch = await bcrypt.compare(testPassword, user!.passwordHash);
      expect(passwordMatch).toBe(true);
    });

    it('should create associated business profile with siteId', async () => {
      const result = await signUp(testEmail, testPassword, testBusinessName);

      expect(result.success).toBe(true);

      const user = await testPrisma.user.findUnique({
        where: { email: testEmail },
        include: { business: true },
      });

      expect(user!.business).toBeDefined();
      expect(user!.business!.name).toBe(testBusinessName);
      expect(user!.business!.siteId).toMatch(/^site_[a-zA-Z0-9_-]{16}$/);
    });

    it('should generate email verification token', async () => {
      const result = await signUp(testEmail, testPassword, testBusinessName);

      expect(result.success).toBe(true);

      const user = await testPrisma.user.findUnique({
        where: { email: testEmail },
      });

      expect(user!.emailVerificationToken).toBeDefined();
      expect(user!.emailVerificationToken!.length).toBeGreaterThan(20);
      expect(user!.emailVerified).toBe(false);
    });

    it('should reject duplicate email registration', async () => {
      // Create first user
      await signUp(testEmail, testPassword, testBusinessName);

      // Attempt to create second user with same email
      const result = await signUp(testEmail, 'DifferentPass123!', 'Different Business');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should reject weak password (< 8 characters)', async () => {
      const result = await signUp(testEmail, 'Weak1!', testBusinessName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 8 characters');
    });

    it('should reject password without lowercase letter', async () => {
      const result = await signUp(testEmail, 'UPPERCASE123!', testBusinessName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('lowercase letter');
    });

    it('should reject password without uppercase letter', async () => {
      const result = await signUp(testEmail, 'lowercase123!', testBusinessName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('uppercase letter');
    });

    it('should reject password without number', async () => {
      const result = await signUp(testEmail, 'NoNumberPass!', testBusinessName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('number');
    });

    it('should reject password without symbol', async () => {
      const result = await signUp(testEmail, 'NoSymbol123', testBusinessName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('symbol');
    });

    it('should reject invalid email format', async () => {
      const result = await signUp('invalid-email', testPassword, testBusinessName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email');
    });

    it('should reject empty business name', async () => {
      const result = await signUp(testEmail, testPassword, '');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Business name is required');
    });
  });

  describe('signIn', () => {
    beforeEach(async () => {
      // Create test user
      await signUp(testEmail, testPassword, testBusinessName);
    });

    it('should sign in user with valid credentials', async () => {
      const result = await signIn(testEmail, testPassword);

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const result = await signIn('invalid-email', testPassword);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email');
    });

    it('should reject empty password', async () => {
      const result = await signIn(testEmail, '');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password is required');
    });
  });

  describe('verifyEmail', () => {
    let verificationToken: string;

    beforeEach(async () => {
      // Create test user and get verification token
      await signUp(testEmail, testPassword, testBusinessName);
      const user = await testPrisma.user.findUnique({
        where: { email: testEmail },
      });
      verificationToken = user!.emailVerificationToken!;
    });

    it('should verify email with valid token', async () => {
      const result = await verifyEmail(verificationToken);

      expect(result.success).toBe(true);

      // Verify in database
      const user = await testPrisma.user.findUnique({
        where: { email: testEmail },
      });
      expect(user!.emailVerified).toBe(true);
      expect(user!.emailVerificationToken).toBeNull();
    });

    it('should reject token after it has been used (single-use security)', async () => {
      // Verify first time
      const firstResult = await verifyEmail(verificationToken);
      expect(firstResult.success).toBe(true);

      // Attempt to use same token again (should fail - tokens are single-use)
      const secondResult = await verifyEmail(verificationToken);

      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('Invalid or expired');
    });

    it('should reject invalid verification token', async () => {
      const result = await verifyEmail('invalid-token-12345');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired');
    });

    it('should reject empty token', async () => {
      const result = await verifyEmail('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should clear verification token after successful verification', async () => {
      await verifyEmail(verificationToken);

      // Attempt to use same token again (should fail because token is cleared)
      const user = await testPrisma.user.findUnique({
        where: { email: testEmail },
      });
      expect(user!.emailVerificationToken).toBeNull();
    });
  });

  describe('resendVerificationEmail', () => {
    beforeEach(async () => {
      // Create test user
      await signUp(testEmail, testPassword, testBusinessName);
    });

    it('should generate new verification token for unverified user', async () => {
      const user1 = await testPrisma.user.findUnique({
        where: { email: testEmail },
      });
      const originalToken = user1!.emailVerificationToken;

      const result = await resendVerificationEmail(testEmail);

      expect(result.success).toBe(true);

      // Verify new token is different
      const user2 = await testPrisma.user.findUnique({
        where: { email: testEmail },
      });
      expect(user2!.emailVerificationToken).not.toBe(originalToken);
    });

    it('should reject resend for already verified email', async () => {
      // Verify email first
      const user = await testPrisma.user.findUnique({
        where: { email: testEmail },
      });
      await verifyEmail(user!.emailVerificationToken!);

      // Attempt to resend
      const result = await resendVerificationEmail(testEmail);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already verified');
    });

    it('should not reveal if email exists (security)', async () => {
      const result = await resendVerificationEmail('nonexistent@example.com');

      // Should return success even if email doesn't exist (don't leak info)
      expect(result.success).toBe(true);
    });
  });
});
