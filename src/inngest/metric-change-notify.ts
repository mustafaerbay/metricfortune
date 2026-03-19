/**
 * Significant Metric Change Notification
 * Story 2.7: Email Notifications & Digests — AC #6
 *
 * Triggered when a significant metric change is detected (e.g., conversion rate
 * drops >20% week-over-week). Sends a transactional alert email to the user.
 *
 * Event published by session aggregation job when conversion rate drops >20% WoW.
 */

import 'server-only';
import { inngest } from '@/lib/inngest';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

export const metricChangeNotifyJob = inngest.createFunction(
  {
    id: 'metric-change-notify',
    name: 'Significant Metric Change Notification',
    retries: 3,
  },
  { event: 'metrics/significant-change' },
  async ({ event, step, logger }) => {
    const { businessId, siteId, metric, change, userId } = event.data as {
      businessId: string;
      siteId: string;
      metric: string;
      change: number;
      userId: string;
    };

    logger.info(
      `[MetricChangeNotify] Significant change detected: ${metric} ${change > 0 ? '+' : ''}${change.toFixed(1)}% for business ${businessId}`
    );

    // Fetch user and check notification preference
    const user = await step.run('fetch-user', async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        include: { business: true },
      });
    });

    if (!user) {
      logger.warn(`[MetricChangeNotify] User ${userId} not found`);
      return { status: 'skipped', reason: 'user-not-found' };
    }

    // Respect emailNotificationsEnabled preference (AC #6)
    if (!user.emailNotificationsEnabled) {
      logger.info(`[MetricChangeNotify] User ${userId} has notifications disabled — skipping`);
      return { status: 'skipped', reason: 'notifications-disabled' };
    }

    const businessName = user.business?.name ?? 'your store';
    const metricLabel = metric === 'conversion_rate' ? 'Conversion Rate' : metric;
    const changeAbs = Math.abs(change);
    const direction = change < 0 ? 'dropped' : 'increased';
    const dashboardUrl = `${APP_URL}/dashboard`;
    const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${user.emailUnsubscribeToken}`;

    await step.run('send-alert-email', async () => {
      await resend.emails.send({
        from: 'MetricFortune Alerts <insights@metricfortune.app>',
        to: user.email,
        subject: `⚠️ Alert: ${metricLabel} ${direction} ${changeAbs.toFixed(1)}% for ${businessName}`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f9fc;padding:40px 0;">
    <tr><td>
      <table width="600" align="center" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;margin:0 auto;">
        <tr>
          <td style="background:#dc2626;padding:24px 40px;">
            <p style="color:#fff;font-size:20px;font-weight:bold;margin:0;">⚠️ MetricFortune Alert</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="color:#111;font-size:16px;line-height:26px;">Hi there,</p>
            <p style="color:#111;font-size:16px;line-height:26px;">
              We detected a significant change in your store metrics for <strong>${businessName}</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin:24px 0;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="color:#991b1b;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">Metric Alert</p>
                  <p style="color:#111;font-size:22px;font-weight:bold;margin:0 0 4px;">${metricLabel}</p>
                  <p style="color:#dc2626;font-size:18px;font-weight:bold;margin:0;">${direction === 'dropped' ? '↓' : '↑'} ${changeAbs.toFixed(1)}% week-over-week</p>
                </td>
              </tr>
            </table>
            <p style="color:#555;font-size:16px;line-height:26px;">
              Visit your dashboard to review your metrics and explore recommendations to improve performance.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr>
                <td style="border-radius:6px;background:#7c3aed;">
                  <a href="${dashboardUrl}" style="color:#fff;font-size:16px;font-weight:bold;text-decoration:none;display:inline-block;padding:14px 28px;min-height:44px;border-radius:6px;">View Dashboard</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #e5e7eb;">
            <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">
              <a href="${unsubscribeUrl}" style="color:#7c3aed;text-decoration:underline;">Unsubscribe</a>
              &nbsp;|&nbsp; Manage preferences in your
              <a href="${dashboardUrl}/settings" style="color:#7c3aed;text-decoration:underline;">dashboard settings</a>
            </p>
            <p style="color:#9ca3af;font-size:11px;text-align:center;margin:8px 0 0;">
              MetricFortune &bull; In compliance with CAN-SPAM and GDPR.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      });
    });

    logger.info(`[MetricChangeNotify] Alert sent to ${user.email}`);

    return { status: 'success', userId, metric, change };
  }
);
