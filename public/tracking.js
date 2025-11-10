/**
 * MetricFortune Tracking Script
 * Lightweight JavaScript tracking for e-commerce user behavior
 * Target: <50KB gzipped, <100ms page load impact
 */

(function () {
  'use strict';

  // ---- Idle callback shim (works in Safari/old/SSR/headless) ----
  const _hasWindow = typeof window !== 'undefined' && window;
  const _ric = _hasWindow && typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback.bind(window)
    : (cb) => setTimeout(() => cb({
      didTimeout: false,
      timeRemaining: () => 0
    }), 1);

  // const _cic = _hasWindow && typeof window.cancelIdleCallback === 'function'
  //   ? window.cancelIdleCallback.bind(window)
  //   : (id) => clearTimeout(id);

  // Small helper so code reads nicely
  function scheduleIdle(fn) { return _ric(fn); }

  // function cancelIdleCallback(fn) { return _cic(fn);}

  // Configuration
  const CONFIG = {
    batchSize: 10,
    batchInterval: 5000, // 5 seconds
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    apiEndpoint: 'https://metricfortune.vercel.app/api/track', // Absolute URL for cross-origin tracking
    retryAttempts: 3,
    retryBackoff: 1000, // Start with 1 second
  };

  // State
  let state = {
    siteId: null,
    sessionId: null,
    sessionStart: null,
    lastActivity: null,
    entryPage: null,
    eventQueue: [],
    batchTimer: null,
    pageLoadStart: null,
    initialized: false,
  };

  // Utility: Generate UUID v4
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Utility: Safe localStorage/sessionStorage access
  function safeStorage(type) {
    try {
      const storage = type === 'session' ? window.sessionStorage : window.localStorage;
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return storage;
    } catch (e) {
      return null;
    }
  }

  // Session Management
  function initSession() {
    try {
      const storage = safeStorage('session');
      if (!storage) return;

      const now = Date.now();
      const savedSessionId = storage.getItem('mf_session_id');
      const savedLastActivity = parseInt(storage.getItem('mf_last_activity'), 10);
      const savedEntryPage = storage.getItem('mf_entry_page');

      // Check if session is still valid (within timeout)
      if (savedSessionId && savedLastActivity && (now - savedLastActivity < CONFIG.sessionTimeout)) {
        state.sessionId = savedSessionId;
        state.entryPage = savedEntryPage;
        state.sessionStart = parseInt(storage.getItem('mf_session_start'), 10);
      } else {
        // Create new session
        state.sessionId = generateUUID();
        state.sessionStart = now;
        state.entryPage = window.location.href;
        storage.setItem('mf_session_id', state.sessionId);
        storage.setItem('mf_session_start', state.sessionStart.toString());
        storage.setItem('mf_entry_page', state.entryPage);
      }

      state.lastActivity = now;
      storage.setItem('mf_last_activity', state.lastActivity.toString());
    } catch (e) {
      // Fallback: in-memory session
      if (!state.sessionId) {
        state.sessionId = generateUUID();
        state.sessionStart = Date.now();
        state.entryPage = window.location.href;
        state.lastActivity = state.sessionStart;
      }
    }
  }

  // Update last activity timestamp
  function updateActivity() {
    try {
      const now = Date.now();
      state.lastActivity = now;
      const storage = safeStorage('session');
      if (storage) {
        storage.setItem('mf_last_activity', now.toString());
      }
    } catch (e) {
      // Silent fail
    }
  }

  // Event Queue Management
  function queueEvent(eventType, eventData) {
    try {
      updateActivity();

      const event = {
        siteId: state.siteId,
        sessionId: state.sessionId,
        event: {
          type: eventType,
          timestamp: Date.now(),
          data: eventData
        }
      };

      state.eventQueue.push(event);

      // Send batch if queue size reached
      if (state.eventQueue.length >= CONFIG.batchSize) {
        sendBatch();
      }
    } catch (e) {
      // Silent fail - don't break the host site
    }
  }

  // Send batched events to server
  function sendBatch(retryCount = 0) {
    try {
      if (state.eventQueue.length === 0) return;

      const batch = state.eventQueue.splice(0, state.eventQueue.length);

      // Use sendBeacon if available (best for page unload)
      if (navigator.sendBeacon && retryCount === 0) {
        const success = navigator.sendBeacon(
          CONFIG.apiEndpoint,
          JSON.stringify({ events: batch })
        );
        if (success) return;
      }

      // Fallback to fetch with retry logic
      fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      })
        .then(response => {
          if (!response.ok && retryCount < CONFIG.retryAttempts) {
            // Re-queue events and retry with exponential backoff
            state.eventQueue.unshift(...batch);
            setTimeout(() => {
              sendBatch(retryCount + 1);
            }, CONFIG.retryBackoff * Math.pow(2, retryCount));
          }
        })
        .catch(error => {
          // Network error - re-queue and retry
          if (retryCount < CONFIG.retryAttempts) {
            state.eventQueue.unshift(...batch);
            setTimeout(() => {
              sendBatch(retryCount + 1);
            }, CONFIG.retryBackoff * Math.pow(2, retryCount));
          }
        });
    } catch (e) {
      // Silent fail
    }
  }

  // Start batch send timer
  function startBatchTimer() {
    if (state.batchTimer) clearInterval(state.batchTimer);
    state.batchTimer = setInterval(() => {
      if (state.eventQueue.length > 0) {
        sendBatch();
      }
    }, CONFIG.batchInterval);
  }

  // Event Capture: Pageview
  function capturePageview() {
    try {
      queueEvent('pageview', {
        url: window.location.href,
        referrer: document.referrer || null,
        title: document.title,
        path: window.location.pathname,
      });
    } catch (e) {
      // Silent fail
    }
  }

  // Utility: Sanitize text content
  function sanitizeText(text) {
    if (!text) return null;
    // Remove any HTML tags and limit length
    return text.replace(/<[^>]*>/g, '').substring(0, 50).trim();
  }

  // Event Capture: Click
  function captureClick(event) {
    try {
      const target = event.target;
      const selector = target.id ? `#${target.id}` :
        target.className ? `.${target.className.split(' ')[0]}` :
          target.tagName.toLowerCase();

      queueEvent('click', {
        selector: selector,
        tagName: target.tagName,
        text: sanitizeText(target.innerText),
        href: target.href || null,
        x: event.clientX,
        y: event.clientY,
      });
    } catch (e) {
      // Silent fail
    }
  }

  // Event Capture: Form Interaction
  function captureFormInteraction(event) {
    try {
      const target = event.target;
      const form = target.form;
      const formId = form ? (form.id || form.name || 'unknown') : 'no-form';

      queueEvent('form', {
        formId: formId,
        fieldName: target.name || target.id || 'unknown',
        fieldType: target.type || 'unknown',
        eventType: event.type, // focus, blur, change, submit
      });
    } catch (e) {
      // Silent fail
    }
  }

  // Event Capture: Scroll Depth
  let maxScrollDepth = 0;
  let scrollDebounce = null;

  function captureScrollDepth() {
    try {
      clearTimeout(scrollDebounce);
      scrollDebounce = setTimeout(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPercent = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;

        if (scrollPercent > maxScrollDepth) {
          maxScrollDepth = scrollPercent;
          queueEvent('scroll', {
            depth: scrollPercent,
            scrollTop: scrollTop,
            scrollHeight: scrollHeight,
          });
        }
      }, 300); // Debounce scroll events
    } catch (e) {
      // Silent fail
    }
  }

  // Event Capture: Time on Page
  function captureTimeOnPage() {
    try {
      const duration = Date.now() - state.pageLoadStart;
      queueEvent('time', {
        duration: duration,
        url: window.location.href,
      });
    } catch (e) {
      // Silent fail
    }
  }

  // Attach event listeners
  function attachListeners() {
    try {
      // Click tracking
      document.addEventListener('click', captureClick, true);

      // Form interaction tracking
      document.addEventListener('focus', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
          captureFormInteraction(e);
        }
      }, true);

      document.addEventListener('change', function (e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
          captureFormInteraction(e);
        }
      }, true);

      document.addEventListener('submit', function (e) {
        if (e.target.tagName === 'FORM') {
          captureFormInteraction(e);
        }
      }, true);

      // Scroll tracking
      window.addEventListener('scroll', captureScrollDepth, { passive: true });

      // Time tracking on page exit
      window.addEventListener('beforeunload', function () {
        captureTimeOnPage();
        sendBatch(); // Send any remaining events
      });

      // Visibility change (tab switch)
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          captureTimeOnPage();
          sendBatch();
        }
      });
    } catch (e) {
      // Silent fail
    }
  }

  // Initialization
  function init(config) {
    try {
      if (state.initialized) {
        console.warn('MetricFortune: Already initialized');
        return;
      }

      if (!config || !config.siteId) {
        console.error('MetricFortune: siteId is required');
        return;
      }

      // Validate siteId format (alphanumeric, hyphens, underscores)
      if (!/^[a-zA-Z0-9_-]+$/.test(config.siteId)) {
        console.error('MetricFortune: Invalid siteId format');
        return;
      }

      // Set initialized flag immediately to prevent double initialization
      state.initialized = true;

      state.siteId = config.siteId;
      state.pageLoadStart = Date.now();

      // Initialize session
      initSession();

      // Start batch timer
      startBatchTimer();

      // Attach event listeners using requestIdleCallback for non-blocking
      // if (window.requestIdleCallback) {
      //   requestIdleCallback(attachListeners);
      // } else {
      //   setTimeout(attachListeners, 1);
      // }
      scheduleIdle(attachListeners);

      // Capture initial pageview
      // if (window.requestIdleCallback) {
      //   requestIdleCallback(capturePageview);
      // } else {
      //   setTimeout(capturePageview, 1);
      // }
      scheduleIdle(capturePageview);
    } catch (e) {
      console.error('MetricFortune: Initialization failed', e);
    }
  }

  // Public API
  window.MetricFortune = window.MetricFortune || {
    init: init,
    version: '1.0.0',
  };

  // Auto-initialization: Check for data-site-id attribute on script tag
  (function autoInit() {
    try {
      // Find the current script tag
      const scripts = document.getElementsByTagName('script');
      let currentScript = null;

      // Try to find our script by looking for tracking.js
      for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src && scripts[i].src.indexOf('tracking.js') > -1) {
          currentScript = scripts[i];
          break;
        }
      }

      // If script tag has data-site-id, auto-initialize
      if (currentScript && currentScript.hasAttribute('data-site-id')) {
        const siteId = currentScript.getAttribute('data-site-id');
        if (siteId) {
          console.log('[MetricFortune] Auto-initializing with siteId:', siteId);
          init({ siteId: siteId });
        }
      }
    } catch (e) {
      // Silent fail - users can still manually initialize
      console.warn('[MetricFortune] Auto-initialization failed, use MetricFortune.init() manually');
    }
  })();

  // ========== Shopify-Specific Tracking Enhancement ==========
  // Detect Shopify environment and track e-commerce conversion events
  (function shopifyTracking() {
    try {
      // Check if running on Shopify (window.Shopify object exists)
      if (typeof window !== 'undefined' && window.Shopify) {
        console.log('[MetricFortune] Shopify environment detected - enabling e-commerce tracking');

        // Track add-to-cart events
        // Modern Shopify themes use theme-specific events or Ajax cart API
        document.addEventListener('click', function(event) {
          try {
            const target = event.target;

            // Check if clicked element is add-to-cart button
            const addToCartButton = target.closest('[data-add-to-cart]') ||
                                   target.closest('form[action*="/cart/add"]') ||
                                   target.closest('button[name="add"]');

            if (addToCartButton) {
              // Find the associated form to extract product data
              const form = addToCartButton.closest('form[action*="/cart/add"]');

              if (form) {
                const formData = new FormData(form);
                const variantId = formData.get('id');
                const quantity = formData.get('quantity') || '1';

                queueEvent('conversion', {
                  type: 'add_to_cart',
                  platform: 'shopify',
                  product_variant_id: variantId,
                  quantity: parseInt(quantity, 10),
                  timestamp: Date.now(),
                });

                console.log('[MetricFortune] Shopify add-to-cart tracked:', { variantId, quantity });
              }
            }
          } catch (e) {
            // Silent fail - don't break add-to-cart functionality
          }
        }, true);

        // Track checkout started (navigation to /checkout)
        // Use Navigation Timing API to detect navigation events
        if (window.PerformanceObserver) {
          try {
            const observer = new PerformanceObserver(function(list) {
              for (const entry of list.getEntries()) {
                if (entry.name && entry.name.includes('/checkout')) {
                  queueEvent('conversion', {
                    type: 'checkout_started',
                    platform: 'shopify',
                    timestamp: Date.now(),
                  });

                  console.log('[MetricFortune] Shopify checkout started tracked');
                }
              }
            });

            observer.observe({ entryTypes: ['navigation'] });
          } catch (e) {
            // Fallback: detect checkout on page load
            if (window.location.pathname.includes('/checkout')) {
              queueEvent('conversion', {
                type: 'checkout_started',
                platform: 'shopify',
                timestamp: Date.now(),
              });
            }
          }
        } else {
          // Fallback for browsers without PerformanceObserver
          if (window.location.pathname.includes('/checkout')) {
            queueEvent('conversion', {
              type: 'checkout_started',
              platform: 'shopify',
              timestamp: Date.now(),
            });
          }
        }

        // Track purchase completion (order confirmation page)
        // Shopify thank-you/order confirmation pages have /thank_you or /orders/ in URL
        if (window.location.pathname.includes('/thank_you') ||
            window.location.pathname.includes('/orders/')) {

          try {
            // Extract order data from Shopify.checkout object if available
            const orderData = window.Shopify && window.Shopify.checkout ? window.Shopify.checkout : {};

            queueEvent('conversion', {
              type: 'purchase_completed',
              platform: 'shopify',
              order_id: orderData.order_id || null,
              total: orderData.total_price || null,
              currency: orderData.currency || null,
              timestamp: Date.now(),
            });

            console.log('[MetricFortune] Shopify purchase completion tracked:', {
              order_id: orderData.order_id,
              total: orderData.total_price,
            });
          } catch (e) {
            // Track purchase event even if order data extraction fails
            queueEvent('conversion', {
              type: 'purchase_completed',
              platform: 'shopify',
              timestamp: Date.now(),
            });
          }
        }

        // Listen for Shopify Ajax cart events (for dynamic add-to-cart without page reload)
        // Some themes trigger custom events on cart updates
        if (document.addEventListener) {
          ['cart:updated', 'cart.requestComplete', 'ajaxCart.afterCartLoad'].forEach(function(eventName) {
            document.addEventListener(eventName, function(event) {
              try {
                queueEvent('conversion', {
                  type: 'cart_updated',
                  platform: 'shopify',
                  timestamp: Date.now(),
                });

                console.log('[MetricFortune] Shopify cart updated event tracked:', eventName);
              } catch (e) {
                // Silent fail
              }
            });
          });
        }
      }
    } catch (e) {
      // Silent fail - don't break the page if Shopify tracking setup fails
      console.warn('[MetricFortune] Shopify tracking initialization failed:', e);
    }
  })();
})();
