import { createTRPCProxyClient, httpLink, TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@/lib/trpc/router";

let trpcClient: ReturnType<typeof createTRPCProxyClient<AppRouter>> | null = null;

export function getTrpcClient() {
  if (!trpcClient) {
    trpcClient = createTRPCProxyClient<AppRouter>({
      links: [
        httpLink({
          url: "/trpc",
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
