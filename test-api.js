#!/usr/bin/env node

/**
 * Direct API test for /api/track endpoint
 * Tests the tracking endpoint with sample data
 */

const API_URL = 'https://metricfortune.vercel.app/api/track';
const SITE_ID = 'site_SfCOKXGWQj0vGgYW'; // Use valid siteId from database

// Test payload matching the tracking.js format
const testPayload = {
  events: [
    {
      siteId: SITE_ID,
      sessionId: 'test-session-' + Date.now(),
      event: {
        type: 'pageview',
        timestamp: Date.now(),
        data: {
          url: 'https://example.com/test-page',
          referrer: 'https://google.com',
          title: 'Test Page',
          path: '/test-page',
        },
      },
    },
    {
      siteId: SITE_ID,
      sessionId: 'test-session-' + Date.now(),
      event: {
        type: 'click',
        timestamp: Date.now(),
        data: {
          selector: '#test-button',
          tagName: 'BUTTON',
          text: 'Test Button',
          href: null,
          x: 100,
          y: 200,
        },
      },
    },
  ],
};

async function testAPI() {
  console.log('🧪 Testing MetricFortune API Endpoint\n');
  console.log('📍 URL:', API_URL);
  console.log('🔑 Site ID:', SITE_ID);
  console.log('📦 Sending', testPayload.events.length, 'events...\n');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    console.log('📊 Response Status:', response.status, response.statusText);
    console.log('📋 Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }

    const data = await response.json();
    console.log('\n📄 Response Body:');
    console.log(JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('\n✅ SUCCESS! Events sent successfully.');
      console.log('\n⏳ Note: Events are buffered and written to DB every 5 seconds.');
      console.log('   Wait 5-10 seconds, then run: node test-tracking.js');
    } else {
      console.log('\n❌ FAILED! Check the error message above.');
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nPossible issues:');
    console.error('1. Network connectivity problem');
    console.error('2. API endpoint not deployed on Vercel');
    console.error('3. CORS configuration issue');
  }
}

// Run test
testAPI();
