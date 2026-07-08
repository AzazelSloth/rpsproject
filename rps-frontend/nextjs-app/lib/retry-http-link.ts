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
  retryableStatusCodes: [408, 500, 502, 503, 504],
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatusCode(error: unknown): number | null {
  const data = (error as { data?: { httpStatus?: unknown } } | null)?.data;

  if (typeof data?.httpStatus === 'number') {
    return data.httpStatus;
  }

  if (error instanceof Error) {
    const match = error.message.match(/\b(408|429|500|502|503|504)\b/);
    return match ? Number(match[1]) : null;
  }

  return null;
}

function isRetryableError(error: unknown, retryableStatusCodes: number[]): boolean {
  const statusCode = getErrorStatusCode(error);

  if (statusCode) {
    return retryableStatusCodes.includes(statusCode);
  }

  if (error instanceof Error) {
    // Check if it's a fetch error (network issue)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
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
                  op.type === 'query' &&
                  retryCount < (config.maxRetries || 3) &&
                  isRetryableError(error, config.retryableStatusCodes || [])
                ) {
                  retryCount++;
                  const jitterMs = Math.random() * 1000; // Add random jitter
                  const totalDelayMs = Math.min(
                    currentDelayMs + jitterMs,
                    config.maxDelayMs || 5000
                  );
                  
                  if (process.env.NODE_ENV === 'development') {
                    console.log(
                      `[tRPC Retry] Attempt ${retryCount}/${config.maxRetries} after ${totalDelayMs.toFixed(0)}ms for ${op.path}`
                    );
                  }
                  
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
