/**
 * Unit Tests for Peer Calculator Service
 * Story 2.5: Peer Benchmarks Tab
 *
 * Tests all calculation functions with known data to ensure accuracy
 */

import { describe, it, expect } from 'vitest';
import {
  calculateUserMetrics,
  calculatePercentile,
  generateExplanation,
  generatePeerGroupDescription
} from '@/services/analytics/peer-calculator';
import type { Session } from '@prisma/client';

describe('calculateUserMetrics', () => {
  it('should calculate metrics correctly from sample sessions', () => {
    const sessions: Partial<Session>[] = [
      { converted: true, bounced: false, journeyPath: ['/home', '/products', '/cart', '/checkout'] },
      { converted: true, bounced: false, journeyPath: ['/products/shirt', '/cart', '/checkout'] },
      { converted: false, bounced: true, journeyPath: ['/home'] },
      { converted: false, bounced: false, journeyPath: ['/products', '/cart'] },
      { converted: false, bounced: false, journeyPath: ['/home', '/products', '/cart', '/checkout'] }
    ] as Session[];

    const metrics = calculateUserMetrics(sessions as Session[]);

    // 2 converted out of 5 = 40%
    expect(metrics.conversionRate).toBe(40);

    // AOV is 0 in MVP (no session-to-order linking)
    expect(metrics.avgOrderValue).toBe(0);

    // 4 reached cart, 3 reached checkout = (4-3)/4 = 25%
    expect(metrics.cartAbandonmentRate).toBe(25);

    // 1 bounced out of 5 = 20%
    expect(metrics.bounceRate).toBe(20);
  });

  it('should return zero metrics for empty sessions array', () => {
    const metrics = calculateUserMetrics([]);

    expect(metrics.conversionRate).toBe(0);
    expect(metrics.avgOrderValue).toBe(0);
    expect(metrics.cartAbandonmentRate).toBe(0);
    expect(metrics.bounceRate).toBe(0);
  });

  it('should handle sessions with no conversions', () => {
    const sessions: Partial<Session>[] = [
      { converted: false, bounced: true, journeyPath: ['/home'] },
      { converted: false, bounced: false, journeyPath: ['/products', '/cart'] }
    ] as Session[];

    const metrics = calculateUserMetrics(sessions as Session[]);

    expect(metrics.conversionRate).toBe(0);
    expect(metrics.avgOrderValue).toBe(0);
    expect(metrics.bounceRate).toBe(50); // 1 bounced out of 2
  });

  it('should handle sessions with no cart activity', () => {
    const sessions: Partial<Session>[] = [
      { converted: false, bounced: true, journeyPath: ['/home'] },
      { converted: false, bounced: true, journeyPath: ['/products'] }
    ] as Session[];

    const metrics = calculateUserMetrics(sessions as Session[]);

    expect(metrics.cartAbandonmentRate).toBe(0); // No cart sessions
  });
});

describe('calculatePercentile', () => {
  it('should calculate top-25 percentile correctly (higher is better)', () => {
    const userValue = 90;
    const peerValues = [10, 20, 30, 40, 50, 60, 70, 80];

    const result = calculatePercentile(userValue, peerValues, true);

    expect(result.percentile).toBe('top-25');
    expect(result.percentileValue).toBe(100); // All peers are below
  });

  it('should calculate median percentile correctly', () => {
    const userValue = 50;
    const peerValues = [10, 20, 30, 40, 60, 70, 80, 90];

    const result = calculatePercentile(userValue, peerValues, true);

    expect(result.percentile).toBe('median');
    expect(result.percentileValue).toBe(50); // 4 out of 8 peers are below
  });

  it('should calculate bottom-25 percentile correctly', () => {
    const userValue = 15;
    const peerValues = [20, 30, 40, 50, 60, 70, 80, 90];

    const result = calculatePercentile(userValue, peerValues, true);

    expect(result.percentile).toBe('bottom-25');
    expect(result.percentileValue).toBe(0); // No peers are below
  });

  it('should handle "lower is better" metrics (bounce rate)', () => {
    const userValue = 20; // Low bounce rate is good
    const peerValues = [30, 35, 40, 45, 50, 55, 60, 65];

    const result = calculatePercentile(userValue, peerValues, false);

    // All peers have higher bounce rates, so user is in top 25%
    expect(result.percentile).toBe('top-25');
    expect(result.percentileValue).toBe(100);
  });

  it('should handle empty peer values array', () => {
    const result = calculatePercentile(50, [], true);

    expect(result.percentile).toBe('median');
    expect(result.percentileValue).toBe(50);
  });

  it('should calculate exact percentile thresholds', () => {
    const peerValues = Array.from({ length: 100 }, (_, i) => i);

    // Test 75th percentile threshold (top-25)
    const result75 = calculatePercentile(75, peerValues, true);
    expect(result75.percentile).toBe('top-25');
    expect(result75.percentileValue).toBeGreaterThanOrEqual(75);

    // Test 25th percentile threshold (bottom-25)
    const result25 = calculatePercentile(24, peerValues, true);
    expect(result25.percentile).toBe('bottom-25');
    expect(result25.percentileValue).toBeLessThan(25);

    // Test 50th percentile (median)
    const result50 = calculatePercentile(50, peerValues, true);
    expect(result50.percentile).toBe('median');
    expect(result50.percentileValue).toBeGreaterThanOrEqual(25);
    expect(result50.percentileValue).toBeLessThan(75);
  });
});

describe('generateExplanation', () => {
  it('should generate explanation for above-average performance', () => {
    const explanation = generateExplanation('conversion rate', 5.2, 3.8, 75);

    expect(explanation).toContain('5.2%');
    expect(explanation).toContain('top');
    expect(explanation).toContain('25%'); // 100 - 75
  });

  it('should generate explanation for below-average performance', () => {
    const explanation = generateExplanation('conversion rate', 2.5, 3.8, 30);

    expect(explanation).toContain('2.5%');
    expect(explanation).toContain('bottom');
    expect(explanation).toContain('30%');
  });

  it('should handle currency metrics (AOV) without percentage', () => {
    const explanation = generateExplanation('average order value', 125.5, 100.0, 80);

    expect(explanation).toContain('125.5');
    expect(explanation).not.toContain('125.5%'); // Should not add % to AOV
    expect(explanation).toContain('top');
  });

  it('should format percentile values correctly', () => {
    const explanation1 = generateExplanation('conversion rate', 5.5, 4.0, 92);
    expect(explanation1).toContain('top 8%'); // 100 - 92

    const explanation2 = generateExplanation('bounce rate', 45.2, 50.0, 15);
    expect(explanation2).toContain('bottom 15%');
  });
});

describe('generatePeerGroupDescription', () => {
  it('should generate correct description string', () => {
    const description = generatePeerGroupDescription(47, 'fashion', '$1-5M');

    expect(description).toBe('Compared to 47 fashion businesses, $1-5M revenue');
  });

  it('should handle different industry and revenue values', () => {
    const description = generatePeerGroupDescription(25, 'electronics', '$500K-1M');

    expect(description).toContain('25');
    expect(description).toContain('electronics');
    expect(description).toContain('$500K-1M');
  });

  it('should handle single peer business', () => {
    const description = generatePeerGroupDescription(1, 'home goods', '$5-10M');

    expect(description).toContain('1 home goods');
  });
});
