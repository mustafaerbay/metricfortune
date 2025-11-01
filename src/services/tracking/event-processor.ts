/**
 * Event Processor Service
 *
 * Handles buffering and batch writes for tracking events.
 * Buffers events in memory and writes to database in batches for performance.
 */

import { prisma } from '@/lib/prisma';
import type { TrackingEvent } from '@/types/tracking';
import type { Prisma } from '@prisma/client';

/**
 * Buffer configuration
 */
const BUFFER_CONFIG = {
  maxSize: 100,        // Maximum events in buffer before flush
  flushIntervalMs: 5000, // Flush interval in milliseconds (5 seconds)
};

/**
 * Buffered event with metadata
 */
interface BufferedEvent {
  siteId: string;
  sessionId: string;
  eventType: string;
  timestamp: Date;
  data: Prisma.InputJsonValue;
}

/**
 * Event buffer storage
 */
class EventBuffer {
  private buffer: BufferedEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;

  /**
   * Add event to buffer
   */
  add(event: BufferedEvent): void {
    this.buffer.push(event);

    // Check if buffer is full
    if (this.buffer.length >= BUFFER_CONFIG.maxSize) {
      this.flush();
    } else if (!this.flushTimer) {
      // Start flush timer if not already running
      this.startFlushTimer();
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setTimeout(() => {
      this.flush();
    }, BUFFER_CONFIG.flushIntervalMs);
  }

  /**
   * Clear flush timer
   */
  private clearFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Clear retry timer
   */
  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Flush buffer to database
   */
  async flush(): Promise<void> {
    // Prevent concurrent flushes
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;
    this.clearFlushTimer();

    // Take current buffer and reset
    const eventsToWrite = this.buffer.splice(0);

    try {
      // Batch write to database
      await prisma.trackingEvent.createMany({
        data: eventsToWrite,
        skipDuplicates: true,
      });

      console.log(`[EventProcessor] Flushed ${eventsToWrite.length} events to database`);
    } catch (error) {
      // Error recovery: re-add failed events to buffer
      console.error('[EventProcessor] Batch write failed:', error);
      console.error(`[EventProcessor] Re-queuing ${eventsToWrite.length} events`);

      // Add failed events back to beginning of buffer
      this.buffer.unshift(...eventsToWrite);

      // Retry after delay (track timer to prevent leaks)
      this.clearRetryTimer();
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        this.flush();
      }, 5000);
    } finally {
      this.isFlushing = false;

      // Restart timer if buffer has events
      if (this.buffer.length > 0 && !this.flushTimer) {
        this.startFlushTimer();
      }
    }
  }

  /**
   * Get current buffer size
   */
  size(): number {
    return this.buffer.length;
  }

  /**
   * Clear buffer (for testing)
   */
  clear(): void {
    this.clearFlushTimer();
    this.clearRetryTimer();
    this.buffer = [];
  }
}

/**
 * Global event buffer instance
 */
const eventBuffer = new EventBuffer();

/**
 * Process tracking event result
 */
export interface ProcessEventResult {
  success: boolean;
  error?: string;
  buffered: boolean;
}

/**
 * Process a tracking event
 *
 * Adds event to buffer for batch processing.
 * Handles immediate flush if buffer is full.
 *
 * @param event - Tracking event to process
 * @returns Processing result
 */
export async function processTrackingEvent(
  event: TrackingEvent
): Promise<ProcessEventResult> {
  try {
    // Convert event to buffered format
    const bufferedEvent: BufferedEvent = {
      siteId: event.siteId,
      sessionId: event.sessionId,
      eventType: event.event.type,
      timestamp: new Date(event.event.timestamp),
      data: event.event.data as Prisma.InputJsonValue,
    };

    // Add to buffer
    eventBuffer.add(bufferedEvent);

    return {
      success: true,
      buffered: true,
    };
  } catch (error) {
    console.error('[EventProcessor] Failed to process event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      buffered: false,
    };
  }
}

/**
 * Process multiple tracking events
 *
 * @param events - Array of tracking events
 * @returns Processing result
 */
export async function processTrackingEvents(
  events: TrackingEvent[]
): Promise<ProcessEventResult> {
  try {
    // Add all events to buffer
    for (const event of events) {
      const bufferedEvent: BufferedEvent = {
        siteId: event.siteId,
        sessionId: event.sessionId,
        eventType: event.event.type,
        timestamp: new Date(event.event.timestamp),
        data: event.event.data as Prisma.InputJsonValue,
      };

      eventBuffer.add(bufferedEvent);
    }

    return {
      success: true,
      buffered: true,
    };
  } catch (error) {
    console.error('[EventProcessor] Failed to process events:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      buffered: false,
    };
  }
}

/**
 * Force flush buffer (for testing or graceful shutdown)
 */
export async function flushEventBuffer(): Promise<void> {
  await eventBuffer.flush();
}

/**
 * Get current buffer size
 */
export function getBufferSize(): number {
  return eventBuffer.size();
}

/**
 * Clear buffer (for testing)
 */
export function clearEventBuffer(): void {
  eventBuffer.clear();
}
