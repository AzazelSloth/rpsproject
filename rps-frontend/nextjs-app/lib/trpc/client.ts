import { createTRPCProxyClient, httpLink, TRPCClientError } from "@trpc/client";
import { appFetch, getAppUrl } from "@/lib/api";
import type { AppRouter } from "@/lib/trpc/router";
import { retryHttpLink } from "@/lib/retry-http-link";
import { getRequestThrottler } from "@/lib/request-throttler";

let trpcClient: ReturnType<typeof createTRPCProxyClient<AppRouter>> | null = null;

export function getTrpcClient() {
  if (!trpcClient) {
    const throttler = getRequestThrottler({
      maxConcurrentRequests: 2,
      delayBetweenBatchesMs: 500,
    });

    trpcClient = createTRPCProxyClient<AppRouter>({
      links: [
        // Add retry logic with exponential backoff for transient errors
        retryHttpLink({
          maxRetries: 3,
          initialDelayMs: 100,
          maxDelayMs: 5000,
          backoffMultiplier: 2,
          retryableStatusCodes: [408, 429, 500, 502, 503, 504],
        }),
        // HTTP link with timeout and request throttling
        httpLink({
          url: getAppUrl("/trpc"),
          // Increase timeout for slow connections like Starlink (default is 10s)
          fetch: (url, options) => {
            return throttler.throttle(() =>
              appFetch(String(url), {
                ...options,
                // 2 minutes timeout for large imports
                signal: AbortSignal.timeout(120000),
              })
            );
          },
        }),
      ],
    });
  }

  return trpcClient;
}

export function formatTrpcError(error: unknown): string {
  if (error instanceof TRPCClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Une erreur inattendue s'est produite.";
}
