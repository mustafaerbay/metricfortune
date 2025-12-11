/**
 * Unit Tests: Implementation Tracker Service
 * Story 2.6: Implementation Tracking & Results
 *
 * Tests for before/after metrics calculation, metric change analysis, and status determination.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateMetricChange,
  determineImplementationStatus,
  isAfterPeriodComplete,
} from '@/services/analytics/implementation-tracker';
import type { ChangeMetric, ImplementationStatus } from '@/types/implementation';

describe('Implementation Tracker Service', () => {
  describe('calculateMetricChange', () => {
    it('should calculate positive change for conversion rate improvement', () => {
      const result = calculateMetricChange(10, 15, false); // 10% -> 15% (+50% change)

      expect(result.value).toBeCloseTo(50, 1);
      expect(result.direction).toBe('positive');
      expect(result.formatted).toBe('+50.0%');
      expect(result.color).toBe('green');
    });

    it('should calculate negative change for conversion rate decline', () => {
      const result = calculateMetricChange(15, 10, false); // 15% -> 10% (-33.3% change)

      expect(result.value).toBeCloseTo(-33.3, 1);
      expect(result.direction).toBe('negative');
      expect(result.formatted).toBe('-33.3%');
      expect(result.color).toBe('red');
    });

    it('should calculate neutral change for small variations', () => {
      const result = calculateMetricChange(10, 10.3, false); // 10% -> 10.3% (+3% change, neutral)

      expect(result.value).toBeCloseTo(3, 1);
      expect(result.direction).toBe('neutral');
      expect(result.color).toBe('gray');
    });

    it('should handle lower-is-better metrics (cart abandonment)', () => {
      // Abandonment decreases from 40% to 30% (good!)
      const result = calculateMetricChange(40, 30, true);

      expect(result.value).toBeCloseTo(-25, 1); // -25% change
      expect(result.direction).toBe('positive'); // Decrease is good
      expect(result.formatted).toBe('-25.0%');
      expect(result.color).toBe('green');
    });

    it('should handle lower-is-better metrics with increase (bad)', () => {
      // Abandonment increases from 30% to 40% (bad!)
      const result = calculateMetricChange(30, 40, true);

      expect(result.value).toBeCloseTo(33.3, 1); // +33.3% change
      expect(result.direction).toBe('negative'); // Increase is bad
      expect(result.formatted).toBe('+33.3%');
      expect(result.color).toBe('red');
    });

    it('should handle zero before value gracefully', () => {
      const result = calculateMetricChange(0, 5, false);

      expect(result.value).toBe(0);
      expect(result.direction).toBe('neutral');
      expect(result.formatted).toBe('0.0%');
      expect(result.color).toBe('gray');
    });

    it('should format negative changes with minus sign', () => {
      const result = calculateMetricChange(20, 15, false);

      expect(result.formatted).toContain('-');
      expect(result.formatted).not.toContain('+');
    });

    it('should format positive changes with plus sign', () => {
      const result = calculateMetricChange(15, 20, false);

      expect(result.formatted).toContain('+');
      expect(result.formatted).not.toContain('-');
    });
  });

  describe('determineImplementationStatus', () => {
    const neutralChange: ChangeMetric = {
      value: 2,
      direction: 'neutral',
      formatted: '+2.0%',
      color: 'gray',
    };

    const positiveChange: ChangeMetric = {
      value: 15,
      direction: 'positive',
      formatted: '+15.0%',
      color: 'green',
    };

    const negativeChange: ChangeMetric = {
      value: -15,
      direction: 'negative',
      formatted: '-15.0%',
      color: 'red',
    };

    it('should return "Too early to measure" for < 7 days', () => {
      const status = determineImplementationStatus(5, neutralChange, neutralChange);
      expect(status).toBe('Too early to measure');
    });

    it('should return "Positive trend" for conversion improvement', () => {
      const status = determineImplementationStatus(10, positiveChange, neutralChange);
      expect(status).toBe('Positive trend');
    });

    it('should return "Positive trend" for abandonment decrease', () => {
      const abandonmentDecrease: ChangeMetric = {
        value: -12,
        direction: 'positive',
        formatted: '-12.0%',
        color: 'green',
      };
      const status = determineImplementationStatus(10, neutralChange, abandonmentDecrease);
      expect(status).toBe('Positive trend');
    });

    it('should return "Negative trend" for conversion decline', () => {
      const status = determineImplementationStatus(10, negativeChange, neutralChange);
      expect(status).toBe('Negative trend');
    });

    it('should return "Negative trend" for abandonment increase', () => {
      const abandonmentIncrease: ChangeMetric = {
        value: 12,
        direction: 'negative',
        formatted: '+12.0%',
        color: 'red',
      };
      const status = determineImplementationStatus(10, neutralChange, abandonmentIncrease);
      expect(status).toBe('Negative trend');
    });

    it('should return "No change detected" for neutral metrics', () => {
      const status = determineImplementationStatus(10, neutralChange, neutralChange);
      expect(status).toBe('No change detected');
    });

    it('should prioritize positive trend if any metric improves', () => {
      const abandonmentDecrease: ChangeMetric = {
        value: -8,
        direction: 'positive',
        formatted: '-8.0%',
        color: 'green',
      };
      const status = determineImplementationStatus(14, negativeChange, abandonmentDecrease);
      // Even though conversion declined, abandonment improved -> positive overall
      expect(status).toBe('Positive trend');
    });
  });

  describe('isAfterPeriodComplete', () => {
    it('should return true for implementation > 7 days ago', () => {
      const implementedAt = new Date();
      implementedAt.setDate(implementedAt.getDate() - 10); // 10 days ago

      expect(isAfterPeriodComplete(implementedAt)).toBe(true);
    });

    it('should return false for implementation < 7 days ago', () => {
      const implementedAt = new Date();
      implementedAt.setDate(implementedAt.getDate() - 5); // 5 days ago

      expect(isAfterPeriodComplete(implementedAt)).toBe(false);
    });

    it('should return true for implementation exactly 7 days ago', () => {
      const implementedAt = new Date();
      implementedAt.setDate(implementedAt.getDate() - 7); // Exactly 7 days ago

      expect(isAfterPeriodComplete(implementedAt)).toBe(true);
    });

    it('should handle today as implementation date', () => {
      const implementedAt = new Date(); // Today

      expect(isAfterPeriodComplete(implementedAt)).toBe(false);
    });
  });
});
