import { TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown, retryableStatusCodes: number[]): boolean {
  if (error instanceof Error) {
    // Check if it's a fetch error (network issue)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }
    // Check for specific error messages
    if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
      return true;
    }
    if (error.message.includes('500') || error.message.includes('Internal Server')) {
      return true;
    }
  }
  return false;
}

export function retryHttpLink(options: RetryOptions = {}): TRPCLink<any> {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return (runtime) => {
    return ({ op, next }) => {
      return observable((observer) => {
        let retryCount = 0;
        let currentDelayMs = config.initialDelayMs || 100;

        async function attempt() {
          try {
            next(op).subscribe({
              next(result) {
                observer.next(result);
                retryCount = 0; // Reset on success
              },
              error: async (error) => {
                if (
                  retryCount < (config.maxRetries || 3) &&
                  isRetryableError(error, config.retryableStatusCodes || [])
                ) {
                  retryCount++;
                  const jitterMs = Math.random() * 1000; // Add random jitter
                  const totalDelayMs = Math.min(
                    currentDelayMs + jitterMs,
                    config.maxDelayMs || 5000
                  );
                  
                  console.log(
                    `[tRPC Retry] Attempt ${retryCount}/${config.maxRetries} after ${totalDelayMs.toFixed(0)}ms for ${op.path}`
                  );
                  
                  currentDelayMs = Math.min(
                    currentDelayMs * (config.backoffMultiplier || 2),
                    config.maxDelayMs || 5000
                  );

                  await delay(totalDelayMs);
                  attempt();
                } else {
                  observer.error(error);
                }
              },
              complete() {
                observer.complete();
              },
            });
          } catch (err) {
            observer.error(err as any);
          }
        }

        attempt();
      });
    };
  };
}
