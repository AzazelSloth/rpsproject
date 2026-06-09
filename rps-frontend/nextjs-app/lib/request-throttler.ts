/**
 * Request throttler to prevent rate limiting (429 errors)
 * Limits concurrent requests and adds delay between batches
 */

interface ThrottlerOptions {
  maxConcurrentRequests?: number;
  delayBetweenBatchesMs?: number;
}

const DEFAULT_OPTIONS: ThrottlerOptions = {
  maxConcurrentRequests: 2,
  delayBetweenBatchesMs: 500,
};

class RequestThrottler {
  private activeRequests = 0;
  private queue: Array<() => Promise<any>> = [];
  private maxConcurrent: number;
  private batchDelayMs: number;
  private lastRequestTime = 0;

  constructor(options: ThrottlerOptions = {}) {
    const config = { ...DEFAULT_OPTIONS, ...options };
    this.maxConcurrent = config.maxConcurrentRequests || 2;
    this.batchDelayMs = config.delayBetweenBatchesMs || 500;
  }

  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    // If we can execute now, do it
    if (this.activeRequests < this.maxConcurrent) {
      return this.executeRequest(fn);
    }

    // Otherwise, queue it
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.executeRequest(fn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async executeRequest<T>(fn: () => Promise<T>): Promise<T> {
    this.activeRequests++;

    // Add delay between batch requests to prevent rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.batchDelayMs) {
      await this.delay(this.batchDelayMs - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();

    try {
      const result = await fn();
      return result;
    } finally {
      this.activeRequests--;

      // Process queued requests
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) {
          next();
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current queue status for monitoring
   */
  getStatus() {
    return {
      activeRequests: this.activeRequests,
      queuedRequests: this.queue.length,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

// Global throttler instance
let throttler: RequestThrottler | null = null;

export function getRequestThrottler(options?: ThrottlerOptions): RequestThrottler {
  if (!throttler) {
    throttler = new RequestThrottler(options);
  }
  return throttler;
}

export function resetThrottler(): void {
  throttler = null;
}
