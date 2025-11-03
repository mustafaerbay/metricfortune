/**
 * Inngest Client Configuration
 *
 * Inngest is used for scheduled background jobs and async workflows.
 * This file exports the Inngest client instance used throughout the application.
 *
 * @see https://www.inngest.com/docs
 */

import { Inngest } from 'inngest';

/**
 * Inngest client instance
 *
 * Used to define and register background functions.
 * The app ID should match your Inngest app configuration.
 */
export const inngest = new Inngest({
  id: 'metricfortune',
  name: 'MetricFortune Analytics',
});
