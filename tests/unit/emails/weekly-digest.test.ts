/**
 * Unit Tests: Weekly Digest Email Template
 * Story 2.7: Email Notifications & Digests
 *
 * Tests that the React Email template renders correctly for various data shapes.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import { WeeklyDigestEmail } from '@/emails/weekly-digest';
import type { DigestRecommendation } from '@/emails/weekly-digest';

const baseRec: DigestRecommendation = {
  id: 'rec-1',
  title: 'Improve checkout flow',
  summary: 'High cart abandonment detected at payment step.',
  impactLevel: 'HIGH',
  dashboardUrl: 'https://app.metricfortune.com/dashboard/recommendations?rec=rec-1',
};

const baseProps = {
  userName: 'John',
  businessName: 'John\'s Boutique',
  recommendations: [baseRec],
  conversionTrend: { thisWeek: 3.5, lastWeek: 3.0, change: 0.5 },
  implementationWins: [{ title: 'Streamlined checkout', improvement: '+1.2% conversion rate' }],
  unsubscribeUrl: 'https://app.metricfortune.com/api/unsubscribe?token=token-abc',
};

describe('WeeklyDigestEmail template (AC #7)', () => {
  it('renders without error with full data shape', async () => {
    const html = await render(WeeklyDigestEmail(baseProps));
    expect(html).toBeTruthy();
    expect(html).toContain('Weekly Optimization Digest');
    expect(html).toContain('John');
    // HTML-encoded apostrophe or plain — both accepted
    expect(html.includes("John's Boutique") || html.includes("John&#x27;s Boutique")).toBe(true);
  });

  it('renders recommendation title and summary', async () => {
    const html = await render(WeeklyDigestEmail(baseProps));
    expect(html).toContain('Improve checkout flow');
    expect(html).toContain('High cart abandonment detected at payment step.');
  });

  it('renders deep link button for recommendation (AC #3)', async () => {
    const html = await render(WeeklyDigestEmail(baseProps));
    expect(html).toContain('View Details');
    expect(html).toContain('rec=rec-1');
  });

  it('renders unsubscribe link in footer (AC #8)', async () => {
    const html = await render(WeeklyDigestEmail(baseProps));
    expect(html).toContain('token-abc');
    expect(html).toContain('Unsubscribe');
  });

  it('renders conversion trend when provided (AC #4)', async () => {
    const html = await render(WeeklyDigestEmail(baseProps));
    // React Email renders JSX interpolations with <!-- --> markers, so check values separately
    expect(html).toContain('3.50');
    expect(html).toContain('3.00');
  });

  it('renders implementation wins when provided (AC #4)', async () => {
    const html = await render(WeeklyDigestEmail(baseProps));
    expect(html).toContain('Implementation Wins');
    expect(html).toContain('Streamlined checkout');
  });

  it('hides implementation wins section when empty array (AC #7)', async () => {
    const html = await render(
      WeeklyDigestEmail({ ...baseProps, implementationWins: [] })
    );
    expect(html).not.toContain('Implementation Wins');
  });

  it('renders gracefully when conversionTrend is null (AC #7)', async () => {
    const html = await render(
      WeeklyDigestEmail({ ...baseProps, conversionTrend: null })
    );
    expect(html).toBeTruthy();
    expect(html).not.toContain('Conversion Rate');
  });

  it('renders multiple recommendations correctly (AC #2)', async () => {
    const recs: DigestRecommendation[] = [
      { ...baseRec, id: 'rec-1', title: 'Recommendation 1' },
      { ...baseRec, id: 'rec-2', title: 'Recommendation 2', impactLevel: 'MEDIUM' },
      { ...baseRec, id: 'rec-3', title: 'Recommendation 3', impactLevel: 'LOW' },
    ];
    const html = await render(WeeklyDigestEmail({ ...baseProps, recommendations: recs }));
    expect(html).toContain('Recommendation 1');
    expect(html).toContain('Recommendation 2');
    expect(html).toContain('Recommendation 3');
  });

  it('uses brand color #7c3aed for primary elements', async () => {
    const html = await render(WeeklyDigestEmail(baseProps));
    expect(html).toContain('#7c3aed');
  });
});
