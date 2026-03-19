'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const emailPreferencesSchema = z.object({
  emailNotificationsEnabled: z.boolean(),
  emailDigestFrequency: z.enum(['weekly', 'off']),
  timezone: z.string().max(50),
});

export type EmailPreferencesInput = z.infer<typeof emailPreferencesSchema>;
export type ActionResult = { success: true } | { success: false; error: string };

export async function updateEmailPreferences(
  data: EmailPreferencesInput
): Promise<ActionResult> {
  // Auth check — pattern from recommendations.ts:596-629
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  // Validate input
  const parsed = emailPreferencesSchema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues ?? [];
    return { success: false, error: issues[0]?.message ?? parsed.error.message ?? 'Invalid input' };
  }

  const { emailNotificationsEnabled, emailDigestFrequency, timezone } = parsed.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      emailNotificationsEnabled,
      emailDigestFrequency,
      timezone,
    },
  });

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function getEmailPreferences(): Promise<
  | { success: true; data: { emailNotificationsEnabled: boolean; emailDigestFrequency: string; timezone: string } }
  | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      emailNotificationsEnabled: true,
      emailDigestFrequency: true,
      timezone: true,
    },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  return { success: true, data: user };
}
