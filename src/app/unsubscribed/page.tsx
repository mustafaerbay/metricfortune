/**
 * Unsubscribed Confirmation Page
 * Story 2.7: Email Notifications & Digests — AC #8
 */

import Link from 'next/link';

interface UnsubscribedPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function UnsubscribedPage({ searchParams }: UnsubscribedPageProps) {
  const params = await searchParams;
  const isError = params.error === 'invalid';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f6f9fc',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
        padding: '40px 20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '48px 40px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        {isError ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h1
              style={{
                color: '#111',
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '12px',
              }}
            >
              Invalid Unsubscribe Link
            </h1>
            <p style={{ color: '#555', fontSize: '16px', lineHeight: '26px', marginBottom: '24px' }}>
              This unsubscribe link is invalid or has already been used. If you&apos;d like to
              manage your email preferences, please visit your dashboard settings.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <h1
              style={{
                color: '#111',
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '12px',
              }}
            >
              You&apos;ve been unsubscribed
            </h1>
            <p style={{ color: '#555', fontSize: '16px', lineHeight: '26px', marginBottom: '24px' }}>
              You&apos;ve been unsubscribed from MetricFortune emails. You won&apos;t receive any
              further email notifications.
            </p>
            <p style={{ color: '#555', fontSize: '16px', lineHeight: '26px', marginBottom: '32px' }}>
              You can manage your email preferences at any time in your dashboard settings.
            </p>
          </>
        )}

        <Link
          href="/dashboard/settings"
          style={{
            display: 'inline-block',
            backgroundColor: '#7c3aed',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '14px 28px',
            fontSize: '16px',
            fontWeight: 'bold',
            textDecoration: 'none',
            minHeight: '44px',
          }}
        >
          Manage Email Preferences
        </Link>
      </div>
    </div>
  );
}
