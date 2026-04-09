import { createTRPCProxyClient, httpLink } from "@trpc/client";
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
