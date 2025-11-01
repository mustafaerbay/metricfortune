'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

interface TrackingEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export default function TrackingTestPage() {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!scriptLoaded) return;

    // Intercept tracking events by monkey-patching fetch and sendBeacon
    const originalFetch = window.fetch;
    const originalSendBeacon = navigator.sendBeacon;

    // @ts-ignore - Monkey patch for testing
    window.fetch = function(url, options) {
      if (typeof url === 'string' && url.includes('/api/track')) {
        try {
          const body = JSON.parse(options?.body as string);
          if (body.events) {
            body.events.forEach((evt: { event: TrackingEvent }) => {
              console.log('📊 Tracked Event:', evt.event);
              setEvents(prev => [...prev, evt.event]);
            });
          }
        } catch (e) {
          console.error('Failed to parse tracking event:', e);
        }
        // Don't actually send the request (API doesn't exist yet)
        return Promise.resolve(new Response('{}', { status: 200 }));
      }
      return originalFetch.apply(this, [url, options]);
    };

    // @ts-ignore - Monkey patch for testing
    navigator.sendBeacon = function(url, data) {
      if (typeof url === 'string' && url.includes('/api/track')) {
        try {
          const body = JSON.parse(data as string);
          if (body.events) {
            body.events.forEach((evt: { event: TrackingEvent }) => {
              console.log('📊 Tracked Event (beacon):', evt.event);
              setEvents(prev => [...prev, evt.event]);
            });
          }
        } catch (e) {
          console.error('Failed to parse tracking event:', e);
        }
        return true;
      }
      return originalSendBeacon.apply(this, [url, data]);
    };

    // Initialize tracking
    if (window.MetricFortune) {
      console.log('🚀 Initializing MetricFortune tracking...');
      window.MetricFortune.init({
        siteId: 'test-site-demo'
      });
    }

    // Cleanup
    return () => {
      window.fetch = originalFetch;
      navigator.sendBeacon = originalSendBeacon;
    };
  }, [scriptLoaded]);

  const handleButtonClick = () => {
    console.log('Button clicked!');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!');
  };

  return (
    <>
      <Script
        src="/tracking.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('✅ Tracking script loaded');
          setScriptLoaded(true);
        }}
      />

      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              MetricFortune Tracking Test Page
            </h1>
            <p className="text-gray-600 mb-6">
              Interact with the elements below to test tracking functionality.
              Events are logged to the console and displayed in the event log.
            </p>

            {!scriptLoaded && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-6">
                Loading tracking script...
              </div>
            )}

            {scriptLoaded && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-6">
                ✅ Tracking script loaded and initialized
              </div>
            )}
          </div>

          {/* Interactive Elements */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Interactive Test Elements</h2>

            {/* Button Click Test */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Click Events</h3>
              <div className="flex gap-4">
                <button
                  id="test-button-1"
                  onClick={handleButtonClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition"
                >
                  Click Me (Button 1)
                </button>
                <button
                  id="test-button-2"
                  onClick={handleButtonClick}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md transition"
                >
                  Click Me (Button 2)
                </button>
                <a
                  href="#test-link"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition inline-block"
                >
                  Link Click Test
                </a>
              </div>
            </section>

            {/* Form Interaction Test */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Form Interactions</h3>
              <form id="test-form" onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-1">
                    Product Selection
                  </label>
                  <select
                    id="product"
                    name="product"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a product</option>
                    <option value="product-1">Product 1</option>
                    <option value="product-2">Product 2</option>
                    <option value="product-3">Product 3</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your message"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition"
                >
                  Submit Form
                </button>
              </form>
            </section>

            {/* Scroll Test */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Scroll Depth Tracking</h3>
              <p className="text-gray-600 mb-4">
                Scroll down this page to test scroll depth tracking. Events are triggered at different scroll percentages.
              </p>
              <div className="bg-gradient-to-b from-blue-100 to-purple-100 p-8 rounded-lg h-96 overflow-y-auto">
                <p className="mb-4">Scroll through this content...</p>
                {Array.from({ length: 20 }, (_, i) => (
                  <p key={i} className="mb-4 text-gray-700">
                    Paragraph {i + 1}: This is sample content to enable scrolling.
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Scroll down to trigger scroll depth events.
                  </p>
                ))}
              </div>
            </section>
          </div>

          {/* Event Log */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Log</h2>
            <p className="text-gray-600 mb-4">
              Captured events ({events.length} total):
            </p>

            {events.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-8 rounded text-center">
                No events captured yet. Interact with the elements above to see tracking in action.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.map((event, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 border border-gray-200 p-3 rounded text-sm font-mono"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-blue-600">{event.type.toUpperCase()}</span>
                      <span className="text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-xs text-gray-700 overflow-x-auto">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Testing Instructions</h3>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
              <li>Open browser DevTools console (F12)</li>
              <li>Click buttons to test click tracking</li>
              <li>Focus/type in form fields to test form interaction tracking</li>
              <li>Scroll the page to test scroll depth tracking</li>
              <li>Wait for 5 seconds or trigger 10 events to see batch sending</li>
              <li>All events are logged to console and displayed in the event log above</li>
            </ol>
          </div>

          {/* Additional Scrollable Content */}
          <div className="bg-white rounded-lg shadow-lg p-8 mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Additional Scrollable Content</h2>
            <p className="text-gray-600 mb-4">
              This section provides more content for scroll depth testing.
            </p>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="mb-6 p-4 bg-gray-50 rounded">
                <h4 className="font-semibold text-gray-800 mb-2">Section {i + 1}</h4>
                <p className="text-gray-600">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                  incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                  exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    MetricFortune: {
      init: (config: { siteId: string }) => void;
      version: string;
    };
  }
}
