/**
 * Integration tests for Recommendation Server Actions
 * Tests the recommendations.ts Server Actions with real database operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getRecommendations, markImplemented, dismissRecommendation, planRecommendation } from '@/actions/recommendations';
import { createTestUser, seedBusiness } from '../../helpers/database';
import { testPrisma } from '../../helpers/database';

describe('Recommendation Server Actions Integration Tests', () => {
  let businessId: string;
  let recommendationId: string;

  beforeEach(async () => {
    // Create test business
    const business = await seedBusiness({
      name: 'Test Business',
      industry: 'fashion',
      revenueRange: '1M-5M',
      productTypes: ['clothing'],
      platform: 'Shopify',
    });
    businessId = business.id;

    // Create test recommendation
    const recommendation = await testPrisma.recommendation.create({
      data: {
        businessId,
        title: 'Test Recommendation',
        problemStatement: 'Low conversion rate',
        actionSteps: ['Step 1', 'Step 2'],
        expectedImpact: 'Increase conversion by 10%',
        confidenceLevel: 'HIGH',
        impactLevel: 'HIGH',
        status: 'NEW',
      },
    });
    recommendationId = recommendation.id;
  });

  describe('getRecommendations', () => {
    it('should fetch recommendations by businessId', async () => {
      const result = await getRecommendations(businessId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data!.length).toBeGreaterThan(0);
        expect(result.data![0].businessId).toBe(businessId);
      }
    });

    it('should filter recommendations by status', async () => {
      // Create recommendations with different statuses
      await testPrisma.recommendation.create({
        data: {
          businessId,
          title: 'Planned Recommendation',
          problemStatement: 'Issue',
          actionSteps: ['Step 1'],
          expectedImpact: 'Impact',
          confidenceLevel: 'MEDIUM',
          impactLevel: 'MEDIUM',
          status: 'PLANNED',
        },
      });

      const result = await getRecommendations(businessId, { status: 'NEW' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.every((r) => r.status === 'NEW')).toBe(true);
      }
    });

    it('should return error for invalid businessId', async () => {
      const result = await getRecommendations('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('markImplemented', () => {
    it('should mark recommendation as implemented', async () => {
      const result = await markImplemented(recommendationId);

      expect(result.success).toBe(true);

      // Verify in database
      const updated = await testPrisma.recommendation.findUnique({
        where: { id: recommendationId },
      });
      expect(updated?.status).toBe('IMPLEMENTED');
      expect(updated?.implementedAt).toBeDefined();
    });

    it('should return error for invalid recommendationId', async () => {
      const result = await markImplemented('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('dismissRecommendation', () => {
    it('should dismiss recommendation', async () => {
      const result = await dismissRecommendation(recommendationId);

      expect(result.success).toBe(true);

      // Verify in database
      const updated = await testPrisma.recommendation.findUnique({
        where: { id: recommendationId },
      });
      expect(updated?.status).toBe('DISMISSED');
      expect(updated?.dismissedAt).toBeDefined();
    });

    it('should return error for invalid recommendationId', async () => {
      const result = await dismissRecommendation('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('planRecommendation', () => {
    it('should mark recommendation as planned', async () => {
      const result = await planRecommendation(recommendationId);

      expect(result.success).toBe(true);

      // Verify in database
      const updated = await testPrisma.recommendation.findUnique({
        where: { id: recommendationId },
      });
      expect(updated?.status).toBe('PLANNED');
    });

    it('should return error for invalid recommendationId', async () => {
      const result = await planRecommendation('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('status filtering', () => {
    beforeEach(async () => {
      // Create recommendations with all statuses
      await testPrisma.recommendation.createMany({
        data: [
          {
            businessId,
            title: 'New Rec',
            problemStatement: 'Issue',
            actionSteps: ['Step'],
            expectedImpact: 'Impact',
            confidenceLevel: 'HIGH',
            impactLevel: 'HIGH',
            status: 'NEW',
          },
          {
            businessId,
            title: 'Planned Rec',
            problemStatement: 'Issue',
            actionSteps: ['Step'],
            expectedImpact: 'Impact',
            confidenceLevel: 'MEDIUM',
            impactLevel: 'MEDIUM',
            status: 'PLANNED',
          },
          {
            businessId,
            title: 'Implemented Rec',
            problemStatement: 'Issue',
            actionSteps: ['Step'],
            expectedImpact: 'Impact',
            confidenceLevel: 'LOW',
            impactLevel: 'LOW',
            status: 'IMPLEMENTED',
          },
        ],
      });
    });

    it('should filter by NEW status', async () => {
      const result = await getRecommendations(businessId, { status: 'NEW' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.every((r) => r.status === 'NEW')).toBe(true);
        expect(result.data!.length).toBeGreaterThan(0);
      }
    });

    it('should filter by PLANNED status', async () => {
      const result = await getRecommendations(businessId, { status: 'PLANNED' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.every((r) => r.status === 'PLANNED')).toBe(true);
      }
    });

    it('should filter by IMPLEMENTED status', async () => {
      const result = await getRecommendations(businessId, { status: 'IMPLEMENTED' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.every((r) => r.status === 'IMPLEMENTED')).toBe(true);
      }
    });

    it('should filter by DISMISSED status', async () => {
      const result = await getRecommendations(businessId, { status: 'DISMISSED' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.every((r) => r.status === 'DISMISSED')).toBe(true);
      }
    });
  });
});
