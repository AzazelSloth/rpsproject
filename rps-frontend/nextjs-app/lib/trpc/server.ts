import { appRouter } from "@/lib/trpc/router";

export function getServerTrpcCaller() {
  return appRouter.createCaller({});
}
