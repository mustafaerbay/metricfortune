'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateEmailPreferences } from '@/actions/email-preferences';

// Common timezones list (~20 common zones)
const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Honolulu',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

interface EmailPreferencesFormProps {
  initialEnabled: boolean;
  initialFrequency: string;
  initialTimezone: string;
}

export function EmailPreferencesForm({
  initialEnabled,
  initialFrequency,
  initialTimezone,
}: EmailPreferencesFormProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [frequency, setFrequency] = useState<'weekly' | 'off'>(
    initialFrequency === 'weekly' ? 'weekly' : 'off'
  );
  const [timezone, setTimezone] = useState(initialTimezone);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setIsError(false);

    const result = await updateEmailPreferences({
      emailNotificationsEnabled: enabled,
      emailDigestFrequency: frequency,
      timezone,
    });

    if (result.success) {
      setMessage('Email preferences saved!');
    } else {
      setMessage(result.error);
      setIsError(true);
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div
            className={`rounded-md p-3 text-sm ${
              isError ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
            }`}
          >
            {message}
          </div>
        )}

        {/* Email notifications toggle (controls digest + metric alerts) */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Email Notifications</p>
            <p className="text-xs text-gray-500">
              Receive a weekly digest of new recommendations and significant metric alerts (controls all email types)
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => {
              const newEnabled = !enabled;
              setEnabled(newEnabled);
              setFrequency(newEnabled ? 'weekly' : 'off');
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
              enabled ? 'bg-purple-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Timezone selector */}
        <div>
          <label className="text-sm font-medium" htmlFor="timezone-select">
            Timezone
          </label>
          <p className="mb-1 text-xs text-gray-500">
            Digest sends every Monday at 8am UTC. Timezone is saved for future per-timezone scheduling.
          </p>
          <select
            id="timezone-select"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Email Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
