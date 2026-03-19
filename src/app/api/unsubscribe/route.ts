/**
 * Unsubscribe API Endpoint
 * Story 2.7: Email Notifications & Digests — AC #8
 *
 * GET /api/unsubscribe?token=<emailUnsubscribeToken>
 *
 * No authentication required — the token IS the credential.
 * CAN-SPAM / GDPR compliant one-click unsubscribe.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/unsubscribed?error=invalid`);
  }

  const user = await prisma.user.findUnique({
    where: { emailUnsubscribeToken: token },
    select: { id: true, emailNotificationsEnabled: true },
  });

  if (!user) {
    return NextResponse.redirect(`${APP_URL}/unsubscribed?error=invalid`);
  }

  // Set emailNotificationsEnabled = false
  await prisma.user.update({
    where: { id: user.id },
    data: { emailNotificationsEnabled: false },
  });

  return NextResponse.redirect(`${APP_URL}/unsubscribed`);
}
