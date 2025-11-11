/**
 * Integration tests for Business Profile Server Actions
 * Tests the business-profile.ts Server Actions with real database operations
 * AC #4: API integration tests for all endpoints (business profile)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  completeProfile,
  updateBusinessProfile,
  regenerateSiteId,
  isProfileComplete,
  getBusinessProfile,
} from '@/actions/business-profile';
import { testPrisma } from '../../helpers/database';

// Mock auth to return authenticated session
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

// Mock business matcher to avoid complex peer group calculations
vi.mock('@/services/matching/business-matcher', () => ({
  calculatePeerGroup: vi.fn().mockResolvedValue({
    peerGroupId: 'mock-peer-group',
    matchCount: 5,
    matchCriteria: { tier: 1 },
  }),
  recalculatePeerGroupsForIndustry: vi.fn().mockResolvedValue(undefined),
}));

describe('Business Profile Server Actions Integration Tests', () => {
  const testUserId = 'test-user-id';
  let testBusinessId: string;

  beforeEach(async () => {
    // Create test user with empty business profile (simulates post-signup state)
    const user = await testPrisma.user.create({
      data: {
        id: testUserId,
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        emailVerified: true,
        business: {
          create: {
            name: 'Test Business',
            industry: '',
            revenueRange: '',
            productTypes: [],
            platform: '',
            siteId: `site_initial_${Date.now()}`,
          },
        },
      },
      include: { business: true },
    });
    testBusinessId = user.business!.id;
  });

  describe('completeProfile', () => {
    const completeProfileData = {
      industry: 'fashion',
      revenueRange: '1M-5M',
      productTypes: ['clothing', 'accessories'],
      platform: 'Shopify',
    };

    it('should complete business profile with valid data', async () => {
      const result = await completeProfile(completeProfileData);

      expect(result.success).toBe(true);
      expect(result.data?.siteId).toBeDefined();
      expect(result.data?.siteId).toMatch(/^site_initial_|^[a-zA-Z0-9]{12}$/);

      // Verify in database
      const business = await testPrisma.business.findUnique({
        where: { id: testBusinessId },
      });
      expect(business!.industry).toBe('fashion');
      expect(business!.revenueRange).toBe('1M-5M');
      expect(business!.productTypes).toEqual(['clothing', 'accessories']);
      expect(business!.platform).toBe('Shopify');
    });

    it('should generate unique siteId if not already set', async () => {
      // Clear existing siteId
      await testPrisma.business.update({
        where: { id: testBusinessId },
        data: { siteId: '' },
      });

      const result = await completeProfile(completeProfileData);

      expect(result.success).toBe(true);
      expect(result.data?.siteId).toBeDefined();
      expect(result.data?.siteId).toMatch(/^[a-zA-Z0-9]{12}$/);
    });

    it('should use existing siteId if already set', async () => {
      const existingSiteId = 'existingID12';
      await testPrisma.business.update({
        where: { id: testBusinessId },
        data: { siteId: existingSiteId },
      });

      const result = await completeProfile(completeProfileData);

      expect(result.success).toBe(true);
      expect(result.data?.siteId).toBe(existingSiteId);
    });

    it('should reject completing already completed profile', async () => {
      // Complete profile first time
      await completeProfile(completeProfileData);

      // Attempt to complete again
      const result = await completeProfile(completeProfileData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already completed');
    });

    it('should reject invalid industry (empty string)', async () => {
      const result = await completeProfile({
        ...completeProfileData,
        industry: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Industry is required');
    });

    it('should reject invalid revenue range (empty string)', async () => {
      const result = await completeProfile({
        ...completeProfileData,
        revenueRange: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Revenue range is required');
    });

    it('should reject empty productTypes array', async () => {
      const result = await completeProfile({
        ...completeProfileData,
        productTypes: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least one product type is required');
    });

    it('should reject invalid platform (empty string)', async () => {
      const result = await completeProfile({
        ...completeProfileData,
        platform: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Platform is required');
    });
  });

  describe('updateBusinessProfile', () => {
    beforeEach(async () => {
      // Complete profile first
      await testPrisma.business.update({
        where: { id: testBusinessId },
        data: {
          industry: 'fashion',
          revenueRange: '1M-5M',
          productTypes: ['clothing'],
          platform: 'Shopify',
        },
      });
    });

    it('should update business name', async () => {
      const result = await updateBusinessProfile({ name: 'Updated Business Name' });

      expect(result.success).toBe(true);

      // Verify in database
      const business = await testPrisma.business.findUnique({
        where: { id: testBusinessId },
      });
      expect(business!.name).toBe('Updated Business Name');
    });

    it('should update industry', async () => {
      const result = await updateBusinessProfile({ industry: 'electronics' });

      expect(result.success).toBe(true);

      const business = await testPrisma.business.findUnique({
        where: { id: testBusinessId },
      });
      expect(business!.industry).toBe('electronics');
    });

    it('should update revenue range', async () => {
      const result = await updateBusinessProfile({ revenueRange: '5M-10M' });

      expect(result.success).toBe(true);

      const business = await testPrisma.business.findUnique({
        where: { id: testBusinessId },
      });
      expect(business!.revenueRange).toBe('5M-10M');
    });

    it('should update product types', async () => {
      const result = await updateBusinessProfile({
        productTypes: ['clothing', 'accessories', 'shoes'],
      });

      expect(result.success).toBe(true);

      const business = await testPrisma.business.findUnique({
        where: { id: testBusinessId },
      });
      expect(business!.productTypes).toEqual(['clothing', 'accessories', 'shoes']);
    });

    it('should update platform', async () => {
      const result = await updateBusinessProfile({ platform: 'WooCommerce' });

      expect(result.success).toBe(true);

      const business = await testPrisma.business.findUnique({
        where: { id: testBusinessId },
      });
      expect(business!.platform).toBe('WooCommerce');
    });

    it('should update multiple fields at once', async () => {
      const result = await updateBusinessProfile({
        industry: 'electronics',
        revenueRange: '10M-50M',
        platform: 'Custom',
      });

      expect(result.success).toBe(true);

      const business = await testPrisma.business.findUnique({
        where: { id: testBusinessId },
      });
      expect(business!.industry).toBe('electronics');
      expect(business!.revenueRange).toBe('10M-50M');
      expect(business!.platform).toBe('Custom');
    });

    it('should reject empty product types array', async () => {
      const result = await updateBusinessProfile({ productTypes: [] });

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least one product type is required');
    });
  });

  describe('regenerateSiteId', () => {
    it('should generate new unique siteId', async () => {
      const business = await testPrisma.business.findUnique({
        where: { id: testBusinessId },
      });
      const originalSiteId = business!.siteId;

      const result = await regenerateSiteId();

      expect(result.success).toBe(true);
      expect(result.data?.siteId).toBeDefined();
      expect(result.data?.siteId).not.toBe(originalSiteId);
      expect(result.data?.siteId).toMatch(/^[a-zA-Z0-9]{12}$/);

      // Verify in database
      const updatedBusiness = await testPrisma.business.findUnique({
        where: { id: testBusinessId },
      });
      expect(updatedBusiness!.siteId).toBe(result.data?.siteId);
    });

    it('should ensure siteId uniqueness', async () => {
      // Create another business with a specific siteId
      await testPrisma.user.create({
        data: {
          email: 'other@example.com',
          passwordHash: 'hashed',
          emailVerified: true,
          business: {
            create: {
              name: 'Other Business',
              industry: 'fashion',
              revenueRange: '1M-5M',
              productTypes: ['clothing'],
              platform: 'Shopify',
              siteId: 'existingID12',
            },
          },
        },
      });

      const result = await regenerateSiteId();

      expect(result.success).toBe(true);
      expect(result.data?.siteId).not.toBe('existingID12');
    });
  });

  describe('isProfileComplete', () => {
    it('should return false for incomplete profile (empty fields)', async () => {
      const result = await isProfileComplete();

      expect(result.success).toBe(true);
      expect(result.data?.isComplete).toBe(false);
    });

    it('should return true for complete profile', async () => {
      await testPrisma.business.update({
        where: { id: testBusinessId },
        data: {
          industry: 'fashion',
          revenueRange: '1M-5M',
          productTypes: ['clothing'],
          platform: 'Shopify',
        },
      });

      const result = await isProfileComplete();

      expect(result.success).toBe(true);
      expect(result.data?.isComplete).toBe(true);
    });

    it('should return false if productTypes array is empty', async () => {
      await testPrisma.business.update({
        where: { id: testBusinessId },
        data: {
          industry: 'fashion',
          revenueRange: '1M-5M',
          productTypes: [],
          platform: 'Shopify',
        },
      });

      const result = await isProfileComplete();

      expect(result.success).toBe(true);
      expect(result.data?.isComplete).toBe(false);
    });
  });

  describe('getBusinessProfile', () => {
    beforeEach(async () => {
      await testPrisma.business.update({
        where: { id: testBusinessId },
        data: {
          industry: 'fashion',
          revenueRange: '1M-5M',
          productTypes: ['clothing', 'accessories'],
          platform: 'Shopify',
        },
      });
    });

    it('should return complete business profile', async () => {
      const result = await getBusinessProfile();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe(testBusinessId);
      expect(result.data!.name).toBe('Test Business');
      expect(result.data!.industry).toBe('fashion');
      expect(result.data!.revenueRange).toBe('1M-5M');
      expect(result.data!.productTypes).toEqual(['clothing', 'accessories']);
      expect(result.data!.platform).toBe('Shopify');
      expect(result.data!.siteId).toBeDefined();
    });
  });
});
