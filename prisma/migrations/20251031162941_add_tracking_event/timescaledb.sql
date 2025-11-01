-- TimescaleDB Hypertable Conversion
-- This file should be executed manually after the migration is applied
-- Requires TimescaleDB extension to be installed: CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert TrackingEvent table to hypertable
-- This enables time-series optimizations and automatic partitioning
SELECT create_hypertable('TrackingEvent', 'timestamp', if_not_exists => TRUE);

-- Optional: Add retention policy (90 days)
-- Uncomment when Story 1.6 implements automated cleanup
-- SELECT add_retention_policy('TrackingEvent', INTERVAL '90 days');

-- Optional: Enable compression for older data (older than 7 days)
-- ALTER TABLE "TrackingEvent" SET (
--   timescaledb.compress,
--   timescaledb.compress_segmentby = 'siteId'
-- );
-- SELECT add_compression_policy('TrackingEvent', INTERVAL '7 days');
