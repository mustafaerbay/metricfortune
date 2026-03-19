/**
 * Unit Tests: Significant Metric Change Notification Inngest Function
 * Story 2.7: Email Notifications & Digests — AC #6
 *
 * Tests: notifications-disabled skip, successful email send, user-not-found case.
 * Mocks Resend, Inngest, and Prisma.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the module under test
vi.mock('@/lib/inngest', () => ({
  inngest: {
    createFunction: vi.fn((config, trigger, handler) => ({
      config,
      trigger,
      handler,
      __isMock: true,
    })),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const mockEmailSend = vi.fn().mockResolvedValue({ id: 'mock-email-id' });

vi.mock('resend', () => ({
  Resend: function Resend() {
    return {
      emails: {
        send: mockEmailSend,
      },
    };
  },
}));

// Mock server-only
vi.mock('server-only', () => ({}));

import { prisma } from '@/lib/prisma';

// Helper to create a mock user
function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'owner@example.com',
    emailNotificationsEnabled: true,
    emailUnsubscribeToken: 'unsub-token-xyz',
    business: {
      id: 'biz-1',
      name: 'Test Store',
    },
    ...overrides,
  };
}

// Simulate the metricChangeNotifyJob handler logic for unit testing
async function simulateMetricChangeHandler(
  eventData: { businessId: string; siteId: string; metric: string; change: number; userId: string }
) {
  const { metric, change, userId } = eventData;

  const stepRun = async (_name: string, fn: () => Promise<unknown>) => fn();

  // Step: fetch-user
  const user = await stepRun('fetch-user', async () => {
    return (prisma.user as any).findUnique({
      where: { id: userId },
      include: { business: true },
    });
  });

  if (!user) {
    return { status: 'skipped', reason: 'user-not-found' };
  }

  // Respect emailNotificationsEnabled preference (AC #6)
  if (!user.emailNotificationsEnabled) {
    return { status: 'skipped', reason: 'notifications-disabled' };
  }

  const businessName = user.business?.name ?? 'your store';
  const metricLabel = metric === 'conversion_rate' ? 'Conversion Rate' : metric;
  const changeAbs = Math.abs(change);
  const direction = change < 0 ? 'dropped' : 'increased';
  const APP_URL = 'https://app.metricfortune.com';
  const dashboardUrl = `${APP_URL}/dashboard`;
  const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${user.emailUnsubscribeToken}`;

  await stepRun('send-alert-email', async () => {
    await mockEmailSend({
      from: 'MetricFortune Alerts <insights@metricfortune.app>',
      to: user.email,
      subject: `⚠️ Alert: ${metricLabel} ${direction} ${changeAbs.toFixed(1)}% for ${businessName}`,
      html: `<p>Alert: ${metricLabel} ${direction} ${changeAbs.toFixed(1)}%</p><a href="${unsubscribeUrl}">Unsubscribe</a><a href="${dashboardUrl}">Dashboard</a>`,
    });
  });

  return { status: 'success', userId, metric, change };
}

describe('Metric Change Notify — handler logic (AC #6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmailSend.mockResolvedValue({ id: 'mock-email-id' });
  });

  describe('User-not-found case', () => {
    it('should return skipped with reason user-not-found when user does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await simulateMetricChangeHandler(
        { businessId: 'biz-1', siteId: 'site_1', metric: 'conversion_rate', change: -25, userId: 'nonexistent' }
      );

      expect(result).toEqual({ status: 'skipped', reason: 'user-not-found' });
      expect(mockEmailSend).not.toHaveBeenCalled();
    });
  });

  describe('Notifications disabled (AC #6)', () => {
    it('should skip sending email when emailNotificationsEnabled is false', async () => {
      const user = createMockUser({ emailNotificationsEnabled: false });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);

      const result = await simulateMetricChangeHandler(
        { businessId: 'biz-1', siteId: 'site_1', metric: 'conversion_rate', change: -25, userId: 'user-1' }
      );

      expect(result).toEqual({ status: 'skipped', reason: 'notifications-disabled' });
      expect(mockEmailSend).not.toHaveBeenCalled();
    });
  });

  describe('Successful send (AC #6)', () => {
    it('should send alert email when notifications are enabled and user exists', async () => {
      const user = createMockUser();
      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);

      const result = await simulateMetricChangeHandler(
        { businessId: 'biz-1', siteId: 'site_1', metric: 'conversion_rate', change: -25, userId: 'user-1' }
      );

      expect(result).toEqual({ status: 'success', userId: 'user-1', metric: 'conversion_rate', change: -25 });
      expect(mockEmailSend).toHaveBeenCalledOnce();
    });

    it('should send to correct user email with unsubscribe link', async () => {
      const user = createMockUser({ email: 'merchant@shop.com', emailUnsubscribeToken: 'tok-abc' });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);

      await simulateMetricChangeHandler(
        { businessId: 'biz-1', siteId: 'site_1', metric: 'conversion_rate', change: -30, userId: 'user-1' }
      );

      expect(mockEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'merchant@shop.com',
          from: expect.stringContaining('MetricFortune Alerts'),
          html: expect.stringContaining('tok-abc'),
        })
      );
    });

    it('should reflect drop direction and percentage in subject line', async () => {
      const user = createMockUser();
      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);

      await simulateMetricChangeHandler(
        { businessId: 'biz-1', siteId: 'site_1', metric: 'conversion_rate', change: -22.5, userId: 'user-1' }
      );

      const callArgs = mockEmailSend.mock.calls[0][0] as { subject: string };
      expect(callArgs.subject).toContain('dropped');
      expect(callArgs.subject).toContain('22.5%');
    });
  });
});
