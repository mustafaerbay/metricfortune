/**
 * Inngest API Route
 *
 * This route serves the Inngest function registration endpoint.
 * Inngest uses this to discover and execute background functions.
 *
 * @see https://www.inngest.com/docs/sdk/serve
 */

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';

// Import all Inngest functions
import { sessionAggregationJob } from '@/inngest/session-aggregation';
import { patternDetectionJob } from '@/inngest/pattern-detection';
import { recommendationGenerationJob } from '@/inngest/recommendation-generation';
import { shopifyDataSyncJob } from '@/inngest/shopify-data-sync';
import { weeklyDigestJob } from '@/inngest/weekly-digest';
import { metricChangeNotifyJob } from '@/inngest/metric-change-notify';

/**
 * Register all Inngest functions
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sessionAggregationJob,
    patternDetectionJob,
    recommendationGenerationJob,
    shopifyDataSyncJob,
    weeklyDigestJob,
    metricChangeNotifyJob,
  ],
});
