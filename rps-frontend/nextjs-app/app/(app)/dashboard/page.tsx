import { DashboardContent } from "@/components/rps/dashboard-content";
import { getServerTrpcCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const surveys = await getServerTrpcCaller().data.listSurveys({
    scenario: scenario ?? null,
  });

  return <DashboardContent surveys={surveys} scenario={scenario ?? null} />;
}
